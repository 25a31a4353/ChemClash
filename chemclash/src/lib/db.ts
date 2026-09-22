/**
 * ChemClash — Database Client
 *
 * Provides a shared MongoDB collection for auth accounts.
 * Falls back to an in-memory Map when MONGODB_URL is not set
 * (dev / demo mode — data is lost on cold start).
 *
 * Usage:
 *   import { getAccountsStore } from "@/lib/db";
 *   const store = await getAccountsStore();
 *   await store.findByEmail(email);
 */

import { MongoClient, Db, Collection } from "mongodb";

export interface AccountDoc {
  user_id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
  onboarding_done: boolean;
  tour_done: boolean;
  level: string;
  goals: string[];
  chem_coins: number;
  owned_rewards: string[];
}

// ─── MongoDB connection singleton ─────────────────────────────────────────────
// We attach to globalThis so HMR in dev doesn't leak connections.

declare global {
  // eslint-disable-next-line no-var
  var __chemclash_mongo__:
    | { client: MongoClient; db: Db }
    | undefined;
}

async function getMongoDb(): Promise<{ collection: Collection<AccountDoc> } | null> {
  const uri = process.env.MONGODB_URL || process.env.MONGO_URI;
  // Reject local-only URIs — they can't work inside Vercel
  if (!uri || uri.startsWith("mongodb://localhost") || uri.startsWith("mongodb://127")) {
    return null;
  }

  if (!global.__chemclash_mongo__) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME ?? "chemclash");
    global.__chemclash_mongo__ = { client, db };
  }

  const { db } = global.__chemclash_mongo__!;
  return { collection: db.collection<AccountDoc>("accounts") };
}

// ─── In-memory fallback ───────────────────────────────────────────────────────
// Module-level maps survive across requests in the same serverless instance.
// Lost on cold start — acceptable for dev, warn loudly in production.

const _memById = new Map<string, AccountDoc>();
const _memByEmail = new Map<string, string>(); // email -> user_id

// ─── Unified store interface ──────────────────────────────────────────────────

export interface AccountsStore {
  findByEmail(email: string): Promise<AccountDoc | null>;
  findById(id: string): Promise<AccountDoc | null>;
  insert(doc: AccountDoc): Promise<void>;
  update(id: string, patch: Partial<AccountDoc>): Promise<AccountDoc | null>;
}

class MongoStore implements AccountsStore {
  constructor(private col: Collection<AccountDoc>) {}

  async findByEmail(email: string) {
    const doc = await this.col.findOne({ email }, { projection: { _id: 0 } });
    return doc ?? null;
  }

  async findById(id: string) {
    const doc = await this.col.findOne({ user_id: id }, { projection: { _id: 0 } });
    return doc ?? null;
  }

  async insert(doc: AccountDoc) {
    // Use user_id as the Mongo _id for easy lookups
    await this.col.insertOne({ ...doc, _id: doc.user_id } as never);
  }

  async update(id: string, patch: Partial<AccountDoc>) {
    const result = await this.col.findOneAndUpdate(
      { user_id: id },
      { $set: patch },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    return (result as AccountDoc | null) ?? null;
  }
}

class MemoryStore implements AccountsStore {
  async findByEmail(email: string) {
    const id = _memByEmail.get(email);
    return id ? (_memById.get(id) ?? null) : null;
  }

  async findById(id: string) {
    return _memById.get(id) ?? null;
  }

  async insert(doc: AccountDoc) {
    _memById.set(doc.user_id, doc);
    _memByEmail.set(doc.email, doc.user_id);
  }

  async update(id: string, patch: Partial<AccountDoc>) {
    const existing = _memById.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    _memById.set(id, updated);
    return updated;
  }
}

const _memStore = new MemoryStore();

export async function getAccountsStore(): Promise<AccountsStore> {
  try {
    const mongo = await getMongoDb();
    if (mongo) return new MongoStore(mongo.collection);
  } catch (err) {
    console.warn("[db] MongoDB unavailable, using in-memory fallback:", err);
  }
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[db] WARNING: Running in production WITHOUT MongoDB. " +
        "Accounts are in-memory and will be lost on cold start. " +
        "Set MONGODB_URL in Vercel Environment Variables."
    );
  }
  return _memStore;
}
