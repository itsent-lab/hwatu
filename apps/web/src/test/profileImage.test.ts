import { describe, expect, it } from 'vitest';
import { isSupportedProfileImage } from '../lib/profileImage';

describe('프로필 사진 파일 선택', () => {
  it('iPhone 사진 앱의 HEIC와 HEIF 파일을 허용한다', () => {
    expect(isSupportedProfileImage({ name: 'IMG_1234.HEIC', type: '' })).toBe(true);
    expect(isSupportedProfileImage({ name: 'IMG_1235.heif', type: 'application/octet-stream' })).toBe(true);
  });

  it('일반 이미지 형식은 허용하고 다른 파일은 거부한다', () => {
    expect(isSupportedProfileImage({ name: 'family.jpg', type: 'image/jpeg' })).toBe(true);
    expect(isSupportedProfileImage({ name: 'document.pdf', type: 'application/pdf' })).toBe(false);
  });
});
