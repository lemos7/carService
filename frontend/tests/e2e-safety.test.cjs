const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

test('E2E cleanup rejects unrelated projects and escaping paths', async () => {
  const { runPaths, assertSafeDirectory } = await import('../scripts/e2e-safety.mjs');
  for (const id of ['production', 'carcare-e2e-../../secrets', '../outside', undefined]) {
    assert.throws(() => runPaths(process.cwd(), id));
  }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'carcare-safety-'));
  try {
    await assert.rejects(assertSafeDirectory(root, path.dirname(root)));
    const link = path.join(root, 'artifacts');
    await fs.symlink(os.tmpdir(), link, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(assertSafeDirectory(root, path.join(link, 'e2e')));
    await fs.unlink(link);
  } finally { await fs.rmdir(root); }
});

test('E2E compose rejects shared volumes, bind mounts and real secrets', async () => {
  const { validateCompose } = await import('../scripts/e2e-safety.mjs');
  const id = 'carcare-e2e-1234567890123-abcdef12';
  const secrets = path.resolve('artifacts/e2e', id, 'secrets');
  const config = { name: id, services: { web: {} }, volumes: { data: { name: `${id}_data` } }, secrets: { key: { file: path.join(secrets, 'key') } } };
  assert.doesNotThrow(() => validateCompose(config, id, secrets));
  assert.throws(() => validateCompose({ ...config, name: 'production' }, id, secrets));
  assert.throws(() => validateCompose({ ...config, volumes: { data: { name: 'real-data' } } }, id, secrets));
  assert.throws(() => validateCompose({ ...config, services: { web: { volumes: [{ type: 'bind' }] } } }, id, secrets));
  assert.throws(() => validateCompose({ ...config, secrets: { key: { file: path.resolve('secrets/key') } } }, id, secrets));
});
