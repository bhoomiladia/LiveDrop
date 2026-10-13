import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  // Store database in .data/flowmint.db within the workspace
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
};
