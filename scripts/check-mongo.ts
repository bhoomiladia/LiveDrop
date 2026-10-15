// Checks the MongoDB connection from .env.local and creates the app's indexes.
//
//   npm run db:check

import { closeDb, getDb } from "../src/lib/db.ts";

getDb()
  .then(async (db) => {
    await db.command({ ping: 1 });
    const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
    console.log(`Connected to MongoDB database "${db.databaseName}". Indexes are in place.`);
    console.log(`Collections (${collections.length}): ${collections.join(", ") || "none yet"}`);
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
