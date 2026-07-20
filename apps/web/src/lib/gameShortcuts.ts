export function handCardIndexFromKey(code: string, key: string): number | null {
  const codeMatch = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  const digit = codeMatch?.[1] ?? (/^[0-9]$/.test(key) ? key : null);
  if (digit === null) return null;
  return digit === '0' ? 9 : Number(digit) - 1;
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
