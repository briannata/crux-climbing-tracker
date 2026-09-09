/**
 * Media storage.
 *
 * Media used to be kept only as an on-device `file://` path into Expo Go's
 * `Library/Caches`. iOS purges that directory and the container id changes on
 * reinstall, so those references die — which is exactly what happened when
 * Expo Go updated to SDK 57. Media now uploads to Supabase Storage and is
 * referenced by its public URL, which survives reinstalls and new devices.
 */

import { File } from 'expo-file-system';
import type { Media } from '@/constants/climbing';
import { isSupabaseConfigured, supabase } from './supabase';

export const MEDIA_BUCKET = 'climb-media';

/** Already uploaded — a remote URL rather than a device path. */
export const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

/** A legacy on-device path. These are the ones at risk of vanishing. */
export const isLocalUri = (uri: string) => uri.startsWith('file://');

const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function extensionOf(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const ext = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
  return EXT_TYPES[ext] ? ext : '';
}

function contentTypeFor(uri: string, kind: Media['kind']): string {
  const ext = extensionOf(uri);
  if (ext) return EXT_TYPES[ext];
  return kind === 'video' ? 'video/mp4' : 'image/jpeg';
}

/** Whether a local file is still readable. Dead cache paths return false. */
export function localFileExists(uri: string): boolean {
  if (!isLocalUri(uri)) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Upload one local file and return its public URL.
 * Throws when the file is gone or the upload fails, so callers can tell the
 * difference between "nothing to rescue" and "rescued".
 */
export async function uploadLocalFile(
  localUri: string,
  objectPath: string,
  kind: Media['kind']
): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const file = new File(localUri);
  if (!file.exists) throw new Error('File no longer exists on this device');

  const bytes = await file.bytes();
  const contentType = contentTypeFor(localUri, kind);
  const ext = extensionOf(localUri) || (kind === 'video' ? 'mp4' : 'jpg');
  const path = `${objectPath}.${ext}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;

  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload a Media object (and a video's thumbnail) if it still lives on device.
 * Returns the remote-backed Media, or null when there is nothing to upload —
 * either it is already remote or the underlying file is gone.
 */
export async function uploadMedia(
  media: Media,
  keyPrefix: string
): Promise<Media | null> {
  if (isRemoteUri(media.uri)) return null;
  if (!localFileExists(media.uri)) return null;

  const uri = await uploadLocalFile(media.uri, `${keyPrefix}/main`, media.kind);

  let thumb = media.thumb;
  if (thumb && isLocalUri(thumb) && localFileExists(thumb)) {
    try {
      thumb = await uploadLocalFile(thumb, `${keyPrefix}/thumb`, 'image');
    } catch {
      // A missing thumbnail is recoverable; the video itself still plays.
      thumb = undefined;
    }
  } else if (thumb && !isRemoteUri(thumb)) {
    thumb = undefined;
  }

  return { ...media, uri, thumb };
}
