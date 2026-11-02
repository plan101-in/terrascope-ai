import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Supabase configuration with environment variables and verified project credentials
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://kwynxsdgslmtdnteiwxe.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8c2XfTWsD_y033geyrRRXw_u9MrGsSK';

export const BUCKET_NAME = 'terrascope-images';

// Global Supabase client instance
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Cache for signed URLs to reduce latency and redundant roundtrips
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

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
    const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const storagePath = `${userId}/${predictionId}.${extension}`;

    const contentType = imagePayload.type || (extension === 'png' ? 'image/png' : 'image/jpeg');

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, imagePayload, {
        contentType,
        upsert: true,
      });

    if (error) {
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
