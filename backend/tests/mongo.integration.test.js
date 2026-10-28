import { afterEach, describe, expect, it } from 'vitest';
import { createAccountStore } from '../src/services/accounts/store.js';

const sourceUri = process.env.MONGODB_URI;
const dbName = `accessfix_integration_${Date.now()}`;
let stores = [];

function testUri() {
  const uri = new URL(sourceUri);
  uri.pathname = `/${dbName}`;
  return uri.toString();
}

afterEach(async () => {
  await Promise.all(stores.map((store) => store.close()));
  stores = [];
});

describe('Mongo persistence integration', () => {
  it.skipIf(!sourceUri)('persists accounts and share tokens across store recreation', async () => {
    const first = createAccountStore({ uri: testUri(), ttlDays: 1 });
    stores.push(first);
    await first.ready;
    const user = await first.createUser({ email: 'mongo@example.test', password: 'long test password' });
    const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
    const token = await first.createShare({ scanId: 'scan-persisted', userId: user.id, expiresAt });
    await first.close();
    stores = [];

    const second = createAccountStore({ uri: testUri(), ttlDays: 1 });
    stores.push(second);
    await second.ready;
    expect(await second.findUserByEmail('mongo@example.test')).toMatchObject({ id: user.id });
    expect(await second.readShare(token)).toMatchObject({ scanId: 'scan-persisted', userId: user.id });
  });
});
