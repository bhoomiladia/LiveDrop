import { MongoClient, type Collection, type Db, type IndexDescription } from "mongodb";
import type { MessageKind } from "./claims";

// MongoDB (Atlas or self-hosted). One client per server process, kept on globalThis so
// dev reloads reuse the connection pool instead of opening a new one on every edit.
//
// Every document stores its own string id twice: as `id` (what the app reads) and as `_id`
// (so Mongo never adds an ObjectId, which React can't pass from server to client components).

// ----------------------------------------------------------------- row types

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  email_verified: number;
  image: string | null;
  created_at: number;
  updated_at: number;
  role: "seller" | "buyer" | null;
  onboarded_at: number | null;
  bio: string | null;
  shop_name: string | null;
  default_shipping_cents: number | null;
  default_claim_minutes: number | null;
  sizes: string | null;
  interests: string | null;
};

export type AccountRow = { id: string; user_id: string; provider: string; provider_account_id: string; created_at: number };
export type TokenRow = { id: string; identifier: string; token_hash: string; expires_at: number; created_at: number };
export type SessionRow = { id: string; user_id: string; token_hash: string; expires_at: number; created_at: number };

export type ShowRow = {
  id: string;
  seller_id: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  shipping_cents: number;
  agent_delay_seconds: number;
  claim_minutes: number;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
};

export type ItemRow = {
  id: string;
  show_id: string;
  seq: number;
  title: string;
  size: string | null;
  condition: string | null;
  description: string | null;
  price_cents: number;
  status: "draft" | "listed" | "claimed" | "paid" | "on_hold" | "shipped" | "refunded";
  transcript: string | null;
  image_data: string | null;
  retail_hint: string | null;
  retail_cents: number | null; // typical price of similar NEW items (Channel3)
  retail_sources: string | null; // JSON list of those items
  memory_hint: string | null; // pricing memory: how this seller's similar items sold
  category: string | null; // e.g. "Jackets", from the AI listing builder
  auction_ends_at: number | null; // flash auction: bidding closes at this time
  auction_start_cents: number | null;
  auction_closed: number; // 1 once the auction has been settled
  ai_status: "pending" | "done" | "failed" | "off";
  winner_claim_id: string | null;
  created_at: number;
  listed_at: number | null;
};

export type ClaimRow = {
  id: string;
  show_id: string;
  item_id: string;
  viewer_id: string;
  viewer_name: string;
  message_id: string | null;
  source: "human" | "agent";
  status: "won" | "waiting" | "paid" | "released" | "lost";
  created_at: number;
  won_at: number | null;
  bid_cents?: number | null; // auctions: the price this buyer bid
};

export type MessageRow = {
  id: string;
  show_id: string;
  viewer_id: string;
  viewer_name: string;
  text: string;
  kind: MessageKind | "pending" | "answer" | "seller"; // answer = shop assistant (RAG), seller = the seller replying
  item_id: string | null;
  created_at: number;
  reply_to?: string | null;
  sources?: string | null; // JSON list of source labels (assistant answers)
  needs_seller?: number; // 1 = the assistant couldn't answer and asked the seller
};

export type OrderRow = {
  id: string;
  show_id: string;
  viewer_id: string;
  viewer_name: string;
  kind: "bag" | "agent" | "invoice";
  paypal_order_id: string | null;
  status: string; // created | paid | on_hold | voided | refunded | partially_refunded | failed
  item_cents: number;
  shipping_cents: number;
  capture_id: string | null;
  authorization_id: string | null;
  tracking_number: string | null;
  carrier: string | null;
  refunded_cents: number;
  invoice_id: string | null;
  agent_id: string | null;
  undo_until: number | null;
  created_at: number;
  updated_at: number;
};

export type OrderItemRow = { order_id: string; item_id: string };

export type AgentRow = {
  id: string;
  viewer_id: string;
  viewer_name: string;
  email: string | null;
  wish: string;
  sizes: string | null;
  max_item_cents: number;
  weekly_budget_cents: number;
  undo_minutes: number;
  expires_at: number;
  status: "pending" | "active" | "paused" | "deleted";
  setup_token_id: string | null;
  vault_id: string | null;
  slip: string | null;
  return_show_id: string | null;
  created_at: number;
  updated_at: number;
};

export type BidRow = {
  id: string;
  show_id: string;
  item_id: string;
  viewer_id: string;
  viewer_name: string;
  amount_cents: number;
  message_id: string | null;
  created_at: number;
};

export type InvoiceRow = {
  id: string;
  show_id: string;
  viewer_id: string;
  viewer_name: string;
  paypal_invoice_id: string;
  status: "sent" | "paid" | "cancelled";
  item_cents: number;
  shipping_cents: number;
  payer_url: string | null;
  qr_png: string | null; // data URL
  expires_at: number;
  created_at: number;
  updated_at: number;
};

export type InvoiceItemRow = { invoice_id: string; item_id: string };

export type ShopInfoRow = {
  seller_id: string;
  shipping: string | null;
  returns: string | null;
  sizing: string | null;
  other: string | null;
  updated_at: number;
};

export type KnowledgeChunkRow = {
  id: string;
  seller_id: string;
  show_id: string | null; // set for item details (only relevant in that show)
  source: string; // shipping | returns | sizing | other | answer | item:<id>
  label: string; // shown to viewers as the source
  text: string;
  model: string; // embedding model that made the vector
  vector: number[]; // normalized embedding
  created_at: number;
};

type Schema = {
  users: UserRecord;
  accounts: AccountRow;
  verification_tokens: TokenRow;
  password_reset_tokens: TokenRow;
  sessions: SessionRow;
  shows: ShowRow;
  items: ItemRow;
  messages: MessageRow;
  claims: ClaimRow;
  orders: OrderRow;
  order_items: OrderItemRow;
  agents: AgentRow;
  bids: BidRow;
  invoices: InvoiceRow;
  invoice_items: InvoiceItemRow;
  shop_info: ShopInfoRow;
  knowledge_chunks: KnowledgeChunkRow;
};

export type Doc<T> = T & { _id: string };

// ----------------------------------------------------------------- connection

const g = globalThis as unknown as { __liveDropMongo?: Promise<Db>; __liveDropMongoClient?: MongoClient };

export function getDb(): Promise<Db> {
  g.__liveDropMongo ??= connect().catch((err) => {
    g.__liveDropMongo = undefined; // try again on the next request
    throw err;
  });
  return g.__liveDropMongo;
}

export async function col<K extends keyof Schema>(name: K): Promise<Collection<Doc<Schema[K]>>> {
  return (await getDb()).collection<Doc<Schema[K]>>(name);
}

// Closes the shared client (scripts only; the app keeps it open).
export async function closeDb() {
  await g.__liveDropMongoClient?.close();
  g.__liveDropMongo = g.__liveDropMongoClient = undefined;
}

async function connect(): Promise<Db> {
  let uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is not set. Add your MongoDB connection string to .env.local.");

  // MONGODB_USERNAME / MONGODB_PASSWORD, when set, replace any credentials (or <db_password>
  // placeholder) in the URI. Passed as options, so special characters need no URL-encoding.
  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD;
  if (username && password) uri = uri.replace(/^(mongodb(?:\+srv)?:\/\/)[^@/]*@/, "$1");

  const client = new MongoClient(uri, {
    appName: "live-drop",
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
    ...(username && password ? { auth: { username, password } } : {}),
  });
  await client.connect();
  g.__liveDropMongoClient = client;
  const db = client.db(databaseName(uri));
  await ensureIndexes(db);
  return db;
}

// MONGODB_DB, else the database named in the URI path, else "livedrop".
function databaseName(uri: string): string {
  const fromUri = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/)?.[1];
  return process.env.MONGODB_DB?.trim() || (fromUri ? decodeURIComponent(fromUri) : "livedrop");
}

// ----------------------------------------------------------------- indexes

const unique = (key: IndexDescription["key"], extra: Partial<IndexDescription> = {}): IndexDescription => ({ key, unique: true, ...extra });
const byId = unique({ id: 1 });
const stringOnly = (field: string) => ({ partialFilterExpression: { [field]: { $type: "string" } } });

const INDEXES: Record<keyof Schema, IndexDescription[]> = {
  users: [byId, unique({ email: 1 })],
  accounts: [byId, unique({ provider: 1, provider_account_id: 1 }), { key: { user_id: 1 } }],
  verification_tokens: [byId, unique({ token_hash: 1 }), { key: { identifier: 1 } }],
  password_reset_tokens: [byId, unique({ token_hash: 1 }), { key: { identifier: 1 } }],
  sessions: [byId, unique({ token_hash: 1 }), { key: { user_id: 1 } }],
  shows: [byId, { key: { seller_id: 1, created_at: -1 } }, { key: { status: 1 } }],
  items: [
    byId,
    { key: { show_id: 1, seq: 1 } },
    { key: { show_id: 1, listed_at: -1 } },
    { key: { auction_closed: 1, auction_ends_at: 1 } },
  ],
  messages: [byId, { key: { show_id: 1, created_at: -1 } }, { key: { reply_to: 1 } }, { key: { needs_seller: 1 } }],
  claims: [
    byId,
    unique({ item_id: 1, viewer_id: 1 }),
    { key: { item_id: 1, status: 1, created_at: 1 } },
    { key: { show_id: 1, viewer_id: 1 } },
    { key: { viewer_id: 1, created_at: -1 } },
    { key: { status: 1 } },
  ],
  orders: [
    byId,
    unique({ paypal_order_id: 1 }, stringOnly("paypal_order_id")),
    { key: { show_id: 1, viewer_id: 1 } },
    { key: { viewer_id: 1, created_at: -1 } },
    { key: { agent_id: 1, created_at: -1 } },
    { key: { kind: 1, status: 1, undo_until: 1 } },
  ],
  order_items: [unique({ order_id: 1, item_id: 1 }), { key: { item_id: 1 } }],
  agents: [byId, { key: { viewer_id: 1, status: 1, created_at: -1 } }, { key: { status: 1, expires_at: 1 } }],
  bids: [byId, { key: { item_id: 1, amount_cents: -1 } }],
  invoices: [
    byId,
    unique({ paypal_invoice_id: 1 }, stringOnly("paypal_invoice_id")),
    { key: { show_id: 1, viewer_id: 1 } },
    { key: { status: 1 } },
  ],
  invoice_items: [unique({ invoice_id: 1, item_id: 1 }), { key: { item_id: 1 } }],
  shop_info: [unique({ seller_id: 1 })],
  knowledge_chunks: [byId, { key: { seller_id: 1, source: 1 } }, { key: { source: 1 } }],
};

export async function ensureIndexes(db: Db) {
  await Promise.all(
    Object.entries(INDEXES).map(([name, specs]) =>
      db
        .collection(name)
        .createIndexes(specs)
        .catch((err) => console.warn(`[db] creating indexes on ${name} failed:`, (err as Error).message)),
    ),
  );
}

// ----------------------------------------------------------------- inserts

// Documents are stored with every field present (null when empty), like the old SQL rows.
export function withId<T extends { id: string }>(row: T): Doc<T> {
  return { _id: row.id, ...row };
}

export const linkId = (a: string, b: string) => `${a}:${b}`;

export function newUser(u: Pick<UserRecord, "id" | "name" | "email"> & Partial<UserRecord>): Doc<UserRecord> {
  const now = Date.now();
  return withId({
    password_hash: null,
    email_verified: 0,
    image: null,
    created_at: now,
    updated_at: now,
    role: null,
    onboarded_at: null,
    bio: null,
    shop_name: null,
    default_shipping_cents: null,
    default_claim_minutes: null,
    sizes: null,
    interests: null,
    ...u,
  });
}

export function newOrder(
  o: Pick<OrderRow, "id" | "show_id" | "viewer_id" | "viewer_name" | "kind" | "status" | "item_cents" | "shipping_cents"> & Partial<OrderRow>,
): Doc<OrderRow> {
  const now = Date.now();
  return withId({
    paypal_order_id: null,
    capture_id: null,
    authorization_id: null,
    tracking_number: null,
    carrier: null,
    refunded_cents: 0,
    invoice_id: null,
    agent_id: null,
    undo_until: null,
    created_at: now,
    updated_at: now,
    ...o,
  });
}

export async function linkOrderItems(orderId: string, itemIds: string[]) {
  if (!itemIds.length) return;
  await (await col("order_items")).insertMany(itemIds.map((item_id) => ({ _id: linkId(orderId, item_id), order_id: orderId, item_id })));
}

export async function orderItemIds(orderId: string): Promise<string[]> {
  return (await (await col("order_items")).find({ order_id: orderId }).toArray()).map((r) => r.item_id);
}

// Removes the internal _id before a row leaves the server.
export function stripId<T>(doc: Doc<T>): T;
export function stripId<T>(doc: Doc<T> | null | undefined): T | undefined;
export function stripId<T>(doc: Doc<T> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  void _id;
  return rest as T;
}
