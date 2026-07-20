import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(repositoryRoot);

const failures = [];
const warnings = [];

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options
  });
}

function nulList(args) {
  return git(args).split('\0').filter(Boolean);
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function isAllowedExample(path) {
  return path.endsWith('.env.example') || path.includes('.env.') && path.endsWith('.example');
}

const publicFiles = [...new Set(nulList(['ls-files', '-co', '--exclude-standard', '-z']))]
  .filter(isFile)
  .sort();
const publicBodies = publicFiles.map(path => [path, readFileSync(path)]);

const sensitiveName = /(^|\/)(\.env($|\.)|appsettings\.(local|production)\.json$|secrets?($|\.)|id_(rsa|ed25519)$|.*\.(pem|key|p12|pfx|jks|keystore|dump|bak|sql\.gz|log)$)/i;
const sensitiveNames = publicFiles.filter(path => sensitiveName.test(path) && !isAllowedExample(path));
if (sensitiveNames.length) {
  failures.push(`민감한 비예제 파일명이 공개 후보에 ${sensitiveNames.length}개 있습니다.`);
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/
];
const secretPatternFiles = publicBodies
  .filter(([, body]) => secretPatterns.some(pattern => pattern.test(body.toString('utf8'))))
  .map(([path]) => path);
if (secretPatternFiles.length) {
  failures.push(`대표적인 개인키·토큰 패턴이 ${secretPatternFiles.length}개 파일에서 발견됐습니다.`);
}

const ignoredFiles = nulList(['ls-files', '--others', '--ignored', '--exclude-standard', '-z'])
  .filter(isFile)
  .filter(path => !/(^|\/)(?:node_modules|bin|obj|wwwroot)(\/|$)/.test(path));
const privateOperationalFiles = ignoredFiles.filter(path =>
  path.startsWith('deploy/') && !path.startsWith('deploy/examples/') ||
  /appsettings\.(?:local|production)\.json$/i.test(path) ||
  /(^|\/)\.env(?:\.|$)/i.test(path) && !isAllowedExample(path) ||
  /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(path)
);

const genericPrivateValues = new Set([
  'localhost',
  '127.0.0.1',
  'hwatu',
  'production',
  '/usr/bin/dotnet',
  'http://127.0.0.1:5233'
]);

function collectPrivateValues(path) {
  const text = readFileSync(path, 'utf8');
  const values = new Set();
  const add = value => {
    const normalized = value?.trim().replace(/^['"]|['";,]$/g, '');
    if (!normalized || normalized.length < 5 || genericPrivateValues.has(normalized.toLowerCase())) return;
    if (/change-me|replace-with|example\.com/i.test(normalized)) return;
    values.add(normalized);
  };

  if (path.endsWith('.json')) {
    try {
      const sensitiveKey = /connection|string|password|token|secret|server|host|user|database|domain|path|certificate/i;
      const visit = (value, key = '') => {
        if (typeof value === 'string') {
          if (sensitiveKey.test(key) || /(?:Password|User ID|Server|Database)=/i.test(value)) {
            add(value);
            value.split(';').forEach(part => {
              const separator = part.indexOf('=');
              const connectionKey = part.slice(0, separator).trim();
              if (separator > 0 && /^(?:Password|Pwd|User ID|Uid|Server|Host|Database)$/i.test(connectionKey)) {
                add(part.slice(separator + 1));
              }
            });
          }
        } else if (Array.isArray(value)) {
          value.forEach(item => visit(item, key));
        } else if (value && typeof value === 'object') {
          Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
        }
      };
      visit(JSON.parse(text));
    } catch {
      warnings.push(`비공개 JSON 설정 파일 1개를 파싱하지 못했습니다.`);
    }
  }

  const patterns = [
    /server_name\s+([^;\s]+)/g,
    /ssl_certificate(?:_key)?\s+([^;\s]+)/g,
    /root\s+([^;\s]+)/g,
    /proxy_pass\s+([^;\s]+)/g,
    /^(?:User|Group|WorkingDirectory|ExecStart)=(.+)$/gm,
    /^(?:Password|User ID|Server|Database)=(.+)$/gim
  ];
  patterns.forEach(pattern => {
    for (const match of text.matchAll(pattern)) add(match[1]);
  });
  return values;
}

const privateValues = new Set(privateOperationalFiles.flatMap(path => [...collectPrivateValues(path)]));
let privateValueLeakCount = 0;
for (const value of privateValues) {
  for (const [, body] of publicBodies) {
    if (body.includes(Buffer.from(value))) privateValueLeakCount += 1;
  }
}
if (privateValueLeakCount) {
  failures.push(`현재 비공개 운영 값이 공개 후보에 ${privateValueLeakCount}회 포함돼 있습니다.`);
}

const historicalPrivatePaths = new Set(
  git(['log', '--format=', '--name-only', 'HEAD'])
    .split('\n')
    .map(path => path.trim())
    .filter(Boolean)
    .filter(path =>
      path.startsWith('deploy/') && !path.startsWith('deploy/examples/') ||
      sensitiveName.test(path) && !isAllowedExample(path)
    )
);
const historicalPrivatePathCount = historicalPrivatePaths.size;
if (historicalPrivatePathCount) {
  failures.push(`현재 브랜치 이력에 비공개 운영 파일 경로가 ${historicalPrivatePathCount}개 연결돼 있습니다.`);
}

function verifyAssets(verificationPath, algorithm, resolveFile) {
  if (!existsSync(verificationPath)) {
    failures.push(`${verificationPath} 파일이 없습니다.`);
    return;
  }
  const verification = JSON.parse(readFileSync(verificationPath, 'utf8'));
  const mismatches = verification.assets.filter(asset => {
    const path = resolveFile(asset);
    if (!existsSync(path)) return true;
    const body = readFileSync(path);
    const expectedHash = asset[algorithm];
    return createHash(algorithm).update(body).digest('hex') !== expectedHash ||
      asset.bytes !== undefined && body.length !== asset.bytes;
  });
  if (mismatches.length) failures.push(`${verificationPath} 자산 검증 실패: ${mismatches.length}개`);
}

verifyAssets(
  'apps/web/public/cards/hwatu/verification.json',
  'sha1',
  asset => `apps/web/public/cards/hwatu/${asset.cardId}.svg`
);
verifyAssets(
  'apps/web/public/audio/verification.json',
  'sha256',
  asset => `apps/web/public/audio/${asset.file}`
);
verifyAssets(
  'apps/web/public/audio/voices/verification.json',
  'sha256',
  asset => `apps/web/public/audio/voices/${asset.file}`
);

if (!existsSync('licenses/BigScience-OpenRAIL-M.txt')) {
  failures.push('Supertonic 생성 음성의 OpenRAIL-M 라이선스 전문이 없습니다.');
}

const diffChecks = [
  spawnSync('git', ['diff', '--check'], { cwd: repositoryRoot, encoding: 'utf8' }),
  spawnSync('git', ['diff', '--cached', '--check'], { cwd: repositoryRoot, encoding: 'utf8' })
];
if (diffChecks.some(result => result.status !== 0)) {
  failures.push('Git 공백·충돌 표식 검사에 실패했습니다.');
}

const authorName = git(['config', '--get', 'user.name']).trim();
const authorEmail = git(['config', '--get', 'user.email']).trim();
if (authorName !== 'NSJ' || authorEmail !== 'itsent@itsent.co.kr') {
  failures.push('현재 저장소 Git 작성자가 NSJ <itsent@itsent.co.kr>로 설정되지 않았습니다.');
}

console.log(`공개 후보 파일: ${publicFiles.length}개`);
console.log(`비공개 운영 파일: ${privateOperationalFiles.length}개 (공개 후보에서 제외됨)`);
warnings.forEach(message => console.warn(`[주의] ${message}`));

if (failures.length) {
  failures.forEach(message => console.error(`[실패] ${message}`));
  console.error('\n공개 준비가 완료되지 않았습니다. 위 항목을 해결하기 전에는 푸시하지 마세요.');
  process.exit(1);
}

console.log('[통과] 운영 정보, 민감 파일명, 대표 비밀 패턴, 자산 해시와 Git 작성자 검사를 통과했습니다.');
