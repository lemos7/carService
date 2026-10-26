import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestPasswordRecovery } from '../src/components/esqueci-a-senha/passwordRecovery.ts';

test('recuperação delega ao serviço local mesmo com URL configurada', async (context) => {
  const previous = process.env.EXPO_PUBLIC_API_URL;
  context.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previous;
  });
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
  const request = context.mock.method(globalThis, 'fetch', () => { throw Error('HTTP não permitido'); });
  let received;
  const message = await requestPasswordRecovery('ana@example.com', { async recover(email) {
    received = email;
    return 'Simulação concluída. Nenhum e-mail foi enviado.';
  } });
  assert.equal(received, 'ana@example.com');
  assert.match(message, /Nenhum e-mail/);
  assert.equal(request.mock.callCount(), 0);
  await assert.rejects(requestPasswordRecovery('ana@example.com', { async recover() { throw Error('Falha simulada'); } }), /Falha simulada/);
});
