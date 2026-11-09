import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAuth } from '../src/components/auth/validation.ts';

const valid = { name: 'Ana', email: 'ana@example.com', password: '12345678', confirmation: '12345678' };

test('cadastro exige nome, e-mail, oito caracteres e confirmação', () => {
  assert.deepEqual(validateAuth(valid, 'register'), {});
  const errors = validateAuth({ name: ' ', email: 'ana@', password: '1234567', confirmation: 'outra' }, 'register');
  assert.deepEqual(Object.keys(errors), ['name', 'email', 'password', 'confirmation']);
});

test('corrigir valores remove erros; alterar senha revalida a confirmação', () => {
  assert.deepEqual(validateAuth({ ...valid, email: ' ana@example.com ' }, 'register'), {});
  assert.ok(validateAuth({ ...valid, password: 'nova-senha' }, 'register').confirmation);
  assert.deepEqual(validateAuth({ ...valid, password: 'nova-senha', confirmation: 'nova-senha' }, 'register'), {});
});

test('login não impõe regra de criação e recuperação valida somente e-mail', () => {
  assert.deepEqual(validateAuth({ ...valid, name: '', password: 'curta', confirmation: '' }, 'login'), {});
  assert.ok(validateAuth({ ...valid, password: '' }, 'login').password);
  assert.deepEqual(validateAuth({ ...valid, name: '', password: '', confirmation: '' }, 'recovery'), {});
  assert.ok(validateAuth({ ...valid, email: '' }, 'recovery').email);
});
