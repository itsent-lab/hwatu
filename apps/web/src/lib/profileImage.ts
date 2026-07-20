const PROFILE_IMAGE_SIZE = 512;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const IMAGE_FILE_EXTENSION = /\.(?:jpe?g|png|webp|gif|heic|heif)$/i;

export function isSupportedProfileImage(file: Pick<File, 'name' | 'type'>): boolean {
  return file.type.startsWith('image/') || IMAGE_FILE_EXTENSION.test(file.name);
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('사진을 불러오지 못했습니다. JPG, PNG 또는 HEIC 사진을 선택해 주세요.'));
    image.src = source;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('사진을 변환하지 못했습니다.')),
    'image/jpeg',
    .86
  ));
}

export async function prepareProfileImage(file: File): Promise<File> {
  if (!isSupportedProfileImage(file)) throw new Error('사진 파일을 선택해 주세요.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('20MB 이하의 사진을 선택해 주세요.');
  const source = URL.createObjectURL(file);
  try {
    const image = await loadImage(source);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (side < 1) throw new Error('사진 크기를 확인할 수 없습니다.');
    const canvas = document.createElement('canvas');
    canvas.width = PROFILE_IMAGE_SIZE;
    canvas.height = PROFILE_IMAGE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 변환하지 못했습니다.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#fff';
    context.fillRect(0, 0, PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE);
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      PROFILE_IMAGE_SIZE,
      PROFILE_IMAGE_SIZE
    );
    const blob = await canvasBlob(canvas);
    return new File([blob], 'profile.jpg', { type: 'image/jpeg' });
  }
  finally {
    URL.revokeObjectURL(source);
  }
}
