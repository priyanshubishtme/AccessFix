import { MongoClient } from 'mongodb';

const TTL_SECONDS_DEFAULT = 30 * 24 * 60 * 60;

function publicScan(doc) {
  if (!doc) return null;
  const scan = { ...doc };
  delete scan._id;
  delete scan._expireAt;
  delete scan.schemaVersion;
  return scan;
}

/**
 * MongoDB Atlas adapter. Documents expire via TTL indexes on `_expireAt`.
 * `ready` resolves after indexes exist; `createApp` does not wait, `server.js` does.
 * @param {{ uri: string, ttlDays?: number, dbName?: string }} opts
 */
export function createMongoScanRepository({ uri, ttlDays = 30, dbName, maxPoolSize = 10, serverSelectionTimeoutMS = 5000 } = {}) {
  if (!uri) throw new Error('MONGODB_URI is required when STORE=mongo.');
  const ttlSeconds = Math.max(60, Math.round(ttlDays * 24 * 60 * 60)) || TTL_SECONDS_DEFAULT;
  const client = new MongoClient(uri, { maxPoolSize, serverSelectionTimeoutMS });
  let scans;
  let repairs;
  let verifications;
  let usage;
  let crawlPages;
  let discoveryLogs;
  let dbRef;

  const ready = (async () => {
    await client.connect().catch((err) => {
      throw new Error(`MongoDB connection failed; check MONGODB_URI and Atlas network access: ${err.message}`, { cause: err });
    });
    const db = client.db(dbName);
    dbRef = db;
    scans = db.collection('scans');
    repairs = db.collection('repairs');
    verifications = db.collection('verifications');
    usage = db.collection('usage');
    crawlPages = db.collection('crawlPages');
    discoveryLogs = db.collection('discoveryLogs');
    await Promise.all([
      scans.createIndex({ id: 1 }, { unique: true }),
      scans.createIndex({ createdAt: 1 }),
      scans.createIndex({ ownerId: 1, createdAt: -1 }),
      scans.createIndex({ _expireAt: 1 }, { expireAfterSeconds: ttlSeconds }),
      repairs.createIndex({ scanId: 1 }, { unique: true }),
      repairs.createIndex({ _expireAt: 1 }, { expireAfterSeconds: ttlSeconds }),
      verifications.createIndex({ scanId: 1 }),
      verifications.createIndex({ _expireAt: 1 }, { expireAfterSeconds: ttlSeconds }),
      usage.createIndex({ at: 1 }),
      usage.createIndex({ _expireAt: 1 }, { expireAfterSeconds: ttlSeconds }),
      crawlPages.createIndex({ scanId: 1, index: 1 }, { unique: true }),
      crawlPages.createIndex({ _expireAt: 1 }, { expireAfterSeconds: ttlSeconds }),
      discoveryLogs.createIndex({ scanId: 1, index: 1 }, { unique: true }),
      discoveryLogs.createIndex({ _expireAt: 1 }, { expireAfterSeconds: ttlSeconds }),
    ]);
    await db.collection('_schemaMigrations').createIndex({ id: 1 }, { unique: true });
    for (const name of ['scans', 'repairs', 'verifications', 'usage', 'crawlPages', 'discoveryLogs']) {
      await db.collection(name).updateMany({ schemaVersion: { $exists: false } }, { $set: { schemaVersion: 1 } });
    }
    await db.collection('_schemaMigrations').updateOne({ id: 'initial-v1' }, { $set: { id: 'initial-v1', schemaVersion: 1, appliedAt: new Date() } }, { upsert: true });
    return client;
  })();

  const expireAt = () => new Date();
  async function persistRows(collection, scanId, rows) {
    await collection.deleteMany({ scanId });
    if (rows?.length) await collection.insertMany(rows.map((row, index) => ({ ...structuredClone(row), scanId, index, schemaVersion: 1, _expireAt: expireAt() })));
  }
  async function hydrate(doc) {
    const scan = publicScan(doc);
    if (!scan) return null;
    if (doc.pagesStored) scan.pages = (await crawlPages.find({ scanId: scan.id }).sort({ index: 1 }).toArray()).map((entry) => {
      const row = { ...entry };
      delete row.scanId;
      delete row.index;
      delete row.schemaVersion;
      delete row._expireAt;
      return row;
    });
    if (doc.discoveryLogStored) scan.discoveryLog = (await discoveryLogs.find({ scanId: scan.id }).sort({ index: 1 }).toArray()).map((entry) => {
      const row = { ...entry };
      delete row.scanId;
      delete row.index;
      delete row.schemaVersion;
      delete row._expireAt;
      return row;
    });
    return scan;
  }
  const coll = async () => {
    await ready;
    return { scans, repairs, verifications, usage };
  };

  return {
    kind: 'mongo',
    ready,
    async ping() { await ready; await dbRef.command({ ping: 1 }); return 'up'; },
    async close() {
      await client.close();
    },

    async saveScan(scan) {
      const { scans: c } = await coll();
      const { pages = [], discoveryLog = [], ...fields } = scan;
      await persistRows(crawlPages, scan.id, pages);
      await persistRows(discoveryLogs, scan.id, discoveryLog);
      const doc = { ...fields, pagesStored: pages.length > 0, discoveryLogStored: discoveryLog.length > 0, schemaVersion: 1, _expireAt: expireAt() };
      await c.replaceOne({ id: scan.id }, doc, { upsert: true });
      return structuredClone(scan);
    },

    async updateScan(id, patch) {
      const { scans: c } = await coll();
      const { pages, discoveryLog, ...fields } = patch;
      if (pages) await persistRows(crawlPages, id, pages);
      if (discoveryLog) await persistRows(discoveryLogs, id, discoveryLog);
      const $set = { ...structuredClone(fields), ...(pages ? { pagesStored: pages.length > 0 } : {}), ...(discoveryLog ? { discoveryLogStored: discoveryLog.length > 0 } : {}), schemaVersion: 1 };
      const $unset = { ...(pages ? { pages: '' } : {}), ...(discoveryLog ? { discoveryLog: '' } : {}) };
      const result = await c.findOneAndUpdate(
        { id },
        { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
        { returnDocument: 'after' },
      );
      const doc = result && typeof result === 'object' && 'value' in result && !('id' in result) ? result.value : result;
      return hydrate(doc);
    },

    async getScan(id) {
      const { scans: c } = await coll();
      return hydrate(await c.findOne({ id }));
    },

    async listByIds(ids) {
      if (!ids.length) return [];
      const { scans: c } = await coll();
      const found = await c.find({ id: { $in: ids } }).toArray();
      const hydrated = await Promise.all(found.map((d) => hydrate(d)));
      const byId = new Map(hydrated.map((d) => [d.id, d]));
      return ids.map((id) => byId.get(id)).filter(Boolean);
    },

    async recordUsage(entry) {
      const { usage: c } = await coll();
      await c.insertOne({ ...entry, schemaVersion: 1, _expireAt: expireAt() });
    },

    async usageSummary() {
      const { usage: c } = await coll();
      const n = await c.countDocuments({ kind: 'scan' });
      const first = await c.find({ kind: 'scan' }).sort({ at: 1 }).limit(1).next();
      return { scans: n, since: first?.at ?? new Date().toISOString() };
    },

    async saveRepairs(scanId, list) {
      const { repairs: c } = await coll();
      await c.replaceOne(
        { scanId },
        { scanId, items: structuredClone(list), createdAt: new Date().toISOString(), schemaVersion: 1, _expireAt: expireAt() },
        { upsert: true },
      );
    },

    async listRepairs(scanId) {
      const { repairs: c } = await coll();
      const doc = await c.findOne({ scanId });
      return structuredClone(doc?.items ?? []);
    },

    async saveVerification(result) {
      const { verifications: c } = await coll();
      const safe = structuredClone(result);
      delete safe.patchedHtml;
      if (safe.pageFiles) safe.pageFiles = safe.pageFiles.map((page) => {
        const safePage = { ...page };
        delete safePage.html;
        return safePage;
      });
      await c.insertOne({ ...safe, schemaVersion: 1, _expireAt: expireAt() });
    },

    async listVerifications(scanId) {
      const { verifications: c } = await coll();
      const docs = await c.find({ scanId }).sort({ verifiedAt: 1 }).toArray();
      return docs.map((d) => publicScan(d));
    },
  };
}
