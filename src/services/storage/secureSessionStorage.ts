import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const chunkSize = 1800;

async function baseKey(key: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
  return `couple_auth_${digest}`;
}

type Manifest = { generation: string; count: number };

async function getManifest(base: string): Promise<Manifest | null> {
  const value = await SecureStore.getItemAsync(`${base}_manifest`);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Manifest;
    return parsed.generation && parsed.count > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function deleteGeneration(base: string, manifest: Manifest | null) {
  if (!manifest) return;
  await Promise.all(
    Array.from({ length: manifest.count }, (_, index) =>
      SecureStore.deleteItemAsync(`${base}_${manifest.generation}_${index}`),
    ),
  );
}

export const secureSessionStorage = {
  async getItem(key: string) {
    const base = await baseKey(key);
    const manifest = await getManifest(base);
    if (!manifest) return null;

    const chunks = await Promise.all(
      Array.from({ length: manifest.count }, (_, index) =>
        SecureStore.getItemAsync(`${base}_${manifest.generation}_${index}`),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string) {
    const base = await baseKey(key);
    const previousManifest = await getManifest(base);
    const generation = Crypto.randomUUID();
    const chunks = value.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) ?? [''];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${base}_${generation}_${index}`, chunk),
      ),
    );
    await SecureStore.setItemAsync(
      `${base}_manifest`,
      JSON.stringify({ generation, count: chunks.length } satisfies Manifest),
    );
    await deleteGeneration(base, previousManifest);
  },

  async removeItem(key: string) {
    const base = await baseKey(key);
    const manifest = await getManifest(base);
    await SecureStore.deleteItemAsync(`${base}_manifest`);
    await deleteGeneration(base, manifest);
  },
};
