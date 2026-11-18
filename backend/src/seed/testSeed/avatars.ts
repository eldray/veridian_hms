import fs from 'node:fs/promises';
import path from 'node:path';
import { hashOf } from './shared.js';

export type SeedAvatarCategory = 'patients' | 'users';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const CONCURRENCY = 12;

const avatarFile = (category: SeedAvatarCategory, key: string) =>
  `seed-${hashOf(`${category}:${key}`)}.png`;

export const seedAvatarUrl = (category: SeedAvatarCategory, filename: string): string =>
  category === 'users'
    ? `/api/uploads/users/${filename}`
    : `/uploads/patients/${filename}`;

/**
 * Fetch synthetic, deterministic demo portraits from DiceBear and store them in the
 * application's private upload folders. The browser therefore loads only local,
 * authenticated upload URLs; no third-party image host is exposed to staff browsers.
 *
 * Keys are hashed before being sent to the image API. Never pass patient names,
 * dates of birth, folder numbers, or other clinical data to an external image service.
 */
export const seedAvatarImages = async (
  category: SeedAvatarCategory,
  keys: string[],
): Promise<Map<string, string>> => {
  const uniqueKeys = [...new Set(keys.filter((key) => typeof key === 'string' && key.trim()))];
  const directory = path.join(process.cwd(), 'uploads', category);
  await fs.mkdir(directory, { recursive: true });

  const output = new Map<string, string>();
  let cursor = 0;
  let downloaded = 0;
  let reused = 0;
  let failed = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= uniqueKeys.length) return;
      const key = uniqueKeys[index];
      const filename = avatarFile(category, key);
      const destination = path.join(directory, filename);

      try {
        try {
          await fs.access(destination);
          output.set(key, seedAvatarUrl(category, filename));
          reused++;
          continue;
        } catch {
          // Not cached yet; fetch it below.
        }

        const seed = hashOf(key).toString(36);
        const url = `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=f1f5f9`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`image API returned HTTP ${response.status}`);

        const bytes = Buffer.from(await response.arrayBuffer());
        if (
          bytes.length < 8 ||
          bytes.length > MAX_AVATAR_BYTES ||
          bytes[0] !== 0x89 ||
          bytes[1] !== 0x50 ||
          bytes[2] !== 0x4e ||
          bytes[3] !== 0x47
        ) {
          throw new Error('image API did not return a valid PNG within the size limit');
        }

        await fs.writeFile(destination, bytes, { flag: 'wx' }).catch(async (error: any) => {
          // Another worker/process may have created the same deterministic file.
          if (error?.code !== 'EEXIST') throw error;
        });
        output.set(key, seedAvatarUrl(category, filename));
        downloaded++;
      } catch (error) {
        failed++;
        console.warn(`   ⚠️ Demo ${category} avatar unavailable for one record: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, uniqueKeys.length) }, () => worker()));
  console.log(`🖼️ Demo ${category} portraits: ${downloaded} downloaded, ${reused} cached, ${failed} unavailable`);
  return output;
};
