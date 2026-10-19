import { createServiceClient } from './supabase.ts';

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function readAllStoragePaths(
  supabase: ServiceClient,
  rpcName: string,
  args: Record<string, unknown> = {},
) {
  const paths: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .rpc(rpcName, args)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as { storage_path: string }[];
    paths.push(...page.map((item) => item.storage_path));
    if (page.length < pageSize) return paths;
  }
}

export async function removeStoragePaths(supabase: ServiceClient, paths: string[]) {
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await supabase.storage.from('voice-clips').remove(paths.slice(offset, offset + 100));
    if (error) throw error;
  }
}

export async function listStoragePrefixPaths(supabase: ServiceClient, prefix: string) {
  const paths: string[] = [];

  async function walk(folder: string) {
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.storage.from('voice-clips').list(folder, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const entries = data ?? [];
      for (const entry of entries) {
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        if (entry.id) paths.push(path);
        else await walk(path);
      }
      if (entries.length < pageSize) return;
    }
  }

  await walk(prefix);
  return paths;
}
