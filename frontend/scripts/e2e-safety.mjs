import path from 'node:path';
import { lstat, realpath } from 'node:fs/promises';

export function runPaths(root, id) {
  if (!/^carcare-e2e-[0-9]{13}-[a-f0-9]{8}$/.test(id)) {
    throw new Error('Invalid E2E project identifier');
  }
  const base = path.resolve(root, 'artifacts', 'e2e');
  const directory = path.resolve(base, id);
  if (path.dirname(directory) !== base) throw new Error('E2E path escaped its root');
  return { base, directory, secrets: path.join(directory, 'secrets') };
}

// Reject junctions/symlinks at every existing component, including the artifact root.
export async function assertSafeDirectory(root, target) {
  const resolvedRoot = await realpath(root);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !relative) {
    throw new Error('Cleanup path escaped the workspace');
  }
  let cursor = root;
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Unsafe E2E directory');
      const actual = await realpath(cursor);
      const rel = path.relative(resolvedRoot, actual);
      if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('E2E directory escaped root');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
}

export function validateCompose(config, id, secrets) {
  if (config.name !== id) throw new Error('Unexpected Compose project');
  for (const volume of Object.values(config.volumes ?? {})) {
    if (volume.external || !volume.name?.startsWith(`${id}_`)) {
      throw new Error('Compose volume is not isolated');
    }
  }
  for (const service of Object.values(config.services)) {
    if ((service.volumes ?? []).some((volume) => volume.type !== 'volume')) {
      throw new Error('Bind-mounted application data is forbidden');
    }
  }
  for (const secret of Object.values(config.secrets ?? {})) {
    if (path.dirname(path.resolve(secret.file ?? '')) !== path.resolve(secrets)) {
      throw new Error('Compose secret is outside this test run');
    }
  }
}
