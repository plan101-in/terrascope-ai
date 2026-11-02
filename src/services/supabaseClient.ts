import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// The publishable key is browser-safe only when Row Level Security is enabled.
// Do not hardcode a fallback project: a typo in secrets must not write to the wrong database.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const BUCKET_NAME = 'terrascope-images';

// Global Supabase client instance
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://configuration-required.invalid',
  SUPABASE_ANON_KEY || 'configuration-required', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Cache for signed URLs to reduce latency and redundant roundtrips
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function clearSignedImageCache(): void {
  signedUrlCache.clear();
}

/**
 * Uploads an image file or blob to the private terrascope-images bucket.
 * Path format: USER_ID/PREDICTION_UUID.extension
 */
export async function uploadImageToPrivateBucket(
  userId: string,
  imagePayload: File | Blob,
  predictionId: string,
  originalFilename: string
): Promise<{ storagePath: string; error?: string }> {
  try {
    const extension = imagePayload.type === 'image/png' ? 'png' : 'jpg';
    if (!['image/jpeg', 'image/png'].includes(imagePayload.type)) {
      return { storagePath: '', error: 'Only JPEG and PNG images are supported.' };
    }
    const storagePath = `${userId}/${predictionId}.${extension}`;

    const contentType = imagePayload.type || (extension === 'png' ? 'image/png' : 'image/jpeg');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, imagePayload, {
        contentType,
        // No UPDATE permission required by our storage RLS policy.
        upsert: false,
      });

    if (error) {
      // A previous attempt may have uploaded this exact UUID file before a DB failure.
      if (String(error.message).toLowerCase().includes('already exists') ||
          String(error.message).toLowerCase().includes('duplicate')) {
        return { storagePath };
      }
      console.error('Supabase storage upload error:', error);
      return { storagePath, error: error.message };
    }

    return { storagePath };
  } catch (err: any) {
    console.error('Failed to upload image to Supabase storage:', err);
    return { storagePath: '', error: err.message || 'Storage upload failed' };
  }
}

/**
 * Obtains a temporary signed URL for a private image stored in terrascope-images.
 * Uses client-side caching to avoid repeated signed URL generation.
 */
export async function getSignedImageUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!storagePath) return null;

  const now = Date.now();
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > now + 60000) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn(`Could not create signed URL for ${storagePath}:`, error?.message);
      return null;
    }

    signedUrlCache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch (err) {
    console.warn('Error fetching signed URL:', err);
    return null;
  }
}

/**
 * Computes deterministic SHA-256 hash for evaluation JSON data
 */
export async function computeContentHash(content: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(content.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash if SubtleCrypto is unavailable
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
}
