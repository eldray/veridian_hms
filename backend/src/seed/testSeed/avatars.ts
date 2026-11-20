import fs from 'node:fs/promises';
import path from 'node:path';
import { hashOf } from './shared.js';

export type SeedAvatarCategory = 'patients' | 'users';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const CONCURRENCY = 8;
const MIN_REQUEST_INTERVAL_MS = 125;
let nextRequestAt = 0;

const reserveApiSlot = async (): Promise<void> => {
  const now = Date.now();
  const slot = Math.max(now, nextRequestAt);
  nextRequestAt = slot + MIN_REQUEST_INTERVAL_MS;
  const wait = slot - now;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
};

const avatarFile = (category: SeedAvatarCategory, key: string) =>
  `seed-${hashOf(`${category}:${key}`)}.jpg`;

export const seedAvatarUrl = (category: SeedAvatarCategory, filename: string): string =>
  category === 'users'
    ? `/api/uploads/users/${filename}`
    : `/uploads/patients/${filename}`;

/**
 * Download deterministic photographic demo portraits and store them in the
 * application's protected upload folders. These are synthetic demo images,
 * never photographs of the named patient or staff member. Keys are hashed
 * before selecting a portrait; no clinical or personal data is sent externally.
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

        const seed = Math.abs(hashOf(key));
        const gender = seed % 2 === 0 ? 'women' : 'men';
        const portraitNumber = seed % 100;
        const url = `https://randomuser.me/api/portraits/${gender}/${portraitNumber}.jpg`;
        await reserveApiSlot();
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error(`portrait source returned HTTP ${response.status}`);

        const bytes = Buffer.from(await response.arrayBuffer());
        if (
          bytes.length < 4 ||
          bytes.length > MAX_AVATAR_BYTES ||
          bytes[0] !== 0xff ||
          bytes[1] !== 0xd8 ||
          bytes[2] !== 0xff
        ) {
          throw new Error('portrait source did not return a valid JPEG within the size limit');
        }

        await fs.writeFile(destination, bytes, { flag: 'wx' }).catch(async (error: any) => {
          // Another worker/process may have created the same deterministic file.
          if (error?.code !== 'EEXIST') throw error;
        });
        output.set(key, seedAvatarUrl(category, filename));
        downloaded++;
      } catch (error) {
        failed++;
        console.warn(`   ⚠️ Demo ${category} portrait unavailable for one record: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, uniqueKeys.length) }, () => worker()));
  console.log(`🖼️ Demo ${category} portraits: ${downloaded} downloaded, ${reused} cached, ${failed} unavailable`);
  return output;
};
