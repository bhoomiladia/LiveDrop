// One-time copy of the old SQLite database (.data/flowmint.db) into MongoDB.
//
//   npm run db:migrate              # refuses if MongoDB already has data
//   npm run db:migrate -- --force   # upserts anyway (safe to re-run: documents are matched by id)
//
// Reads MONGODB_* from .env.local. The SQLite file is opened read-only and left untouched.

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { closeDb, getDb } from "../src/lib/db.ts";

const TABLES = [
  "users",
  "accounts",
  "verification_tokens",
  "password_reset_tokens",
  "sessions",
  "shows",
  "items",
  "messages",
  "claims",
  "orders",
  "order_items",
  "agents",
  "bids",
  "invoices",
  "invoice_items",
  "shop_info",
  "knowledge_chunks",
];

// The string Mongo uses as _id for each row (the same scheme the app uses).
function idFor(table: string, row: Record<string, unknown>): string {
  if (table === "order_items") return `${row.order_id}:${row.item_id}`;
  if (table === "invoice_items") return `${row.invoice_id}:${row.item_id}`;
  if (table === "shop_info") return String(row.seller_id);
  return String(row.id);
}

function toDoc(table: string, raw: Record<string, unknown>) {
  const row: Record<string, unknown> = { ...raw }; // node:sqlite rows have a null prototype
  // Embeddings were Float32 BLOBs; MongoDB stores them as plain number arrays.
  if (table === "knowledge_chunks" && row.vector instanceof Uint8Array) {
    const b = row.vector;
    row.vector = Array.from(new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  }
  return { _id: idFor(table, row), ...row };
}

async function main() {
  const force = process.argv.includes("--force");
  const file = process.env.DATABASE_PATH || path.join(process.cwd(), ".data", "flowmint.db");
  if (!fs.existsSync(file)) {
    console.log(`No SQLite database at ${file}: nothing to migrate.`);
    return;
  }
  const sqlite = new DatabaseSync(file, { readOnly: true });
  const existing = new Set((sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name));
  const mongo = await getDb();

  if (!force) {
    for (const table of TABLES) {
      if (await mongo.collection(table).estimatedDocumentCount()) {
        console.error(`MongoDB already has data in "${table}". Re-run with --force to merge the SQLite data in anyway.`);
        process.exitCode = 1;
        return;
      }
    }
  }

  for (const table of TABLES) {
    if (!existing.has(table)) continue;
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    if (!rows.length) {
      console.log(`${table.padEnd(22)} 0`);
      continue;
    }
    const docs = rows.map((r) => toDoc(table, r));
    const result = await mongo.collection<{ _id: string }>(table).bulkWrite(
      docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })),
      { ordered: false },
    );
    console.log(`${table.padEnd(22)} ${rows.length} (${result.upsertedCount} new, ${result.modifiedCount} updated)`);
  }
  sqlite.close();
  console.log(`Done. Data is in MongoDB database "${mongo.databaseName}".`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
