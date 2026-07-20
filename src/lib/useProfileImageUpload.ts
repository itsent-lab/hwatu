import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { uploadProfileImage } from './api';
import { saveProfile } from './localStore';
import { prepareProfileImage } from './profileImage';
import type { UserProfile } from './types';

export function useProfileImageUpload(
  enabled: boolean,
  setProfile: Dispatch<SetStateAction<UserProfile | null>>
) {
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(async (file: File) => {
    if (!enabled || uploading) return;
    setUploading(true);
    try {
      const prepared = await prepareProfileImage(file);
      const profile = await uploadProfileImage(prepared);
      setProfile(profile);
      await saveProfile(profile);
    }
    catch (reason) {
      window.alert(reason instanceof Error ? reason.message : '프로필 사진을 저장하지 못했습니다.');
    }
    finally {
      setUploading(false);
    }
  }, [enabled, setProfile, uploading]);
  return { upload: enabled ? upload : undefined, uploading };
}
