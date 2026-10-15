import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  // Store the database in .data/ within the workspace
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "flowmint.db");
  dbInstance = new DatabaseSync(dbPath);

  // Initialize schema with WAL mode and foreign keys for high performance and integrity
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      email_verified INTEGER DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_verification_token ON verification_tokens(token_hash);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token_hash);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

    -- ---------------------------------------------------------------- Live Drop

    CREATE TABLE IF NOT EXISTS shows (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | ended
      shipping_cents INTEGER NOT NULL DEFAULT 700,
      agent_delay_seconds INTEGER NOT NULL DEFAULT 5,
      claim_minutes INTEGER NOT NULL DEFAULT 5,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      ended_at INTEGER,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      title TEXT NOT NULL,
      size TEXT,
      condition TEXT,
      description TEXT,
      price_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | listed | claimed | paid | on_hold | shipped | refunded
      transcript TEXT,
      image_data TEXT,                      -- small JPEG data URL
      retail_hint TEXT,
      ai_status TEXT NOT NULL DEFAULT 'pending', -- pending | done | failed | off
      winner_claim_id TEXT,
      created_at INTEGER NOT NULL,
      listed_at INTEGER,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_items_show ON items(show_id, seq);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewer_name TEXT NOT NULL,
      text TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'other', -- claim | bid | question | other | pending
      item_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_show ON messages(show_id, created_at);

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewer_name TEXT NOT NULL,
      message_id TEXT,
      source TEXT NOT NULL DEFAULT 'human', -- human | agent
      status TEXT NOT NULL,                 -- won | waiting | paid | released | lost
      created_at INTEGER NOT NULL,
      won_at INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      UNIQUE(item_id, viewer_id)
    );
    CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_claims_viewer ON claims(show_id, viewer_id);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewer_name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'bag',        -- bag | agent
      paypal_order_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'created',  -- created | paid | on_hold | voided | refunded | failed
      item_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      capture_id TEXT,
      authorization_id TEXT,
      tracking_number TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_orders_show ON orders(show_id, viewer_id);

    CREATE TABLE IF NOT EXISTS order_items (
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      PRIMARY KEY (order_id, item_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  // Columns added after the first release. CREATE TABLE IF NOT EXISTS doesn't add
  // columns to an existing table, so add any that are missing.
  addColumnIfMissing(dbInstance, "items", "retail_cents", "INTEGER");
  addColumnIfMissing(dbInstance, "items", "retail_sources", "TEXT"); // JSON: similar new products from Channel3

  // AI shopping agents: one per viewer, with a signed permission slip and saved PayPal.
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      viewer_id TEXT NOT NULL,
      viewer_name TEXT NOT NULL,
      email TEXT,
      wish TEXT NOT NULL,
      sizes TEXT,                         -- comma-separated, empty = any size
      max_item_cents INTEGER NOT NULL,
      weekly_budget_cents INTEGER NOT NULL,
      undo_minutes INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL,               -- pending | active | paused | deleted
      setup_token_id TEXT,
      vault_id TEXT,
      slip TEXT,                          -- signed permission slip (JWS)
      return_show_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agents_viewer ON agents(viewer_id, status);
  `);
  addColumnIfMissing(dbInstance, "orders", "agent_id", "TEXT");
  addColumnIfMissing(dbInstance, "orders", "undo_until", "INTEGER");

  // Flash auctions: bids from chat, highest bid wins when the timer ends.
  addColumnIfMissing(dbInstance, "items", "auction_ends_at", "INTEGER");
  addColumnIfMissing(dbInstance, "items", "auction_start_cents", "INTEGER");
  addColumnIfMissing(dbInstance, "items", "auction_closed", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(dbInstance, "claims", "bid_cents", "INTEGER"); // price this buyer agreed to (auctions)
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewer_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      message_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bids_item ON bids(item_id, amount_cents DESC);
  `);

  // After the show: one PayPal invoice per buyer with unpaid items; tracking and refunds on orders.
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewer_name TEXT NOT NULL,
      paypal_invoice_id TEXT UNIQUE,
      status TEXT NOT NULL,          -- sent | paid | cancelled
      item_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      payer_url TEXT,
      qr_png TEXT,                   -- data URL
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_show ON invoices(show_id, viewer_id);
    CREATE TABLE IF NOT EXISTS invoice_items (
      invoice_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      PRIMARY KEY (invoice_id, item_id)
    );
  `);
  addColumnIfMissing(dbInstance, "orders", "carrier", "TEXT");
  addColumnIfMissing(dbInstance, "orders", "refunded_cents", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(dbInstance, "orders", "invoice_id", "TEXT");

  // RAG: the seller's shop info and past answers, split into pieces with embeddings.
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS shop_info (
      seller_id TEXT PRIMARY KEY,
      shipping TEXT,
      returns TEXT,
      sizing TEXT,
      other TEXT,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      show_id TEXT,                  -- set for item details (only relevant in that show)
      source TEXT NOT NULL,          -- shipping | returns | sizing | other | answer | item:<id>
      label TEXT NOT NULL,           -- shown to viewers as the source
      text TEXT NOT NULL,
      model TEXT NOT NULL,           -- embedding model that made the vector
      vector BLOB NOT NULL,          -- Float32Array
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_seller ON knowledge_chunks(seller_id, source);
  `);
  addColumnIfMissing(dbInstance, "messages", "reply_to", "TEXT");
  addColumnIfMissing(dbInstance, "messages", "sources", "TEXT"); // JSON labels for assistant answers
  addColumnIfMissing(dbInstance, "messages", "needs_seller", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(dbInstance, "items", "memory_hint", "TEXT"); // pricing memory, for the seller
  addColumnIfMissing(dbInstance, "items", "category", "TEXT"); // from the AI listing builder (e.g. "Jackets")

  // Accounts are either a seller or a buyer, chosen once at sign-up (or onboarding for Google sign-ins).
  addColumnIfMissing(dbInstance, "users", "role", "TEXT"); // seller | buyer | NULL = not chosen yet
  addColumnIfMissing(dbInstance, "users", "onboarded_at", "INTEGER");
  addColumnIfMissing(dbInstance, "users", "bio", "TEXT");
  addColumnIfMissing(dbInstance, "users", "shop_name", "TEXT"); // sellers
  addColumnIfMissing(dbInstance, "users", "default_shipping_cents", "INTEGER"); // sellers: pre-fills new shows
  addColumnIfMissing(dbInstance, "users", "default_claim_minutes", "INTEGER");
  addColumnIfMissing(dbInstance, "users", "sizes", "TEXT"); // buyers: pre-fills their AI agent
  addColumnIfMissing(dbInstance, "users", "interests", "TEXT");
  // Accounts from before roles existed that already run shows are sellers who are set up.
  dbInstance.exec(`
    UPDATE users SET role = 'seller', onboarded_at = COALESCE(onboarded_at, created_at)
    WHERE role IS NULL AND id IN (SELECT seller_id FROM shows);
  `);

  return dbInstance;
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

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
