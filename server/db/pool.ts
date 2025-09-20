import "dotenv/config";
import { Pool } from "pg";

// Build connection config from environment variables
// Supports both DATABASE_URL and discrete PG* variables
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? { connectionString, max: Number(process.env.PGPOOL_MAX ?? 10) }
    : {
        host: process.env.PGHOST ?? "localhost",
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? "shiv_accounts",
        user: process.env.PGUSER ?? "postgres",
        password: process.env.PGPASSWORD ?? "postgres",
        max: Number(process.env.PGPOOL_MAX ?? 10),
      },
);

export async function pingDb() {
  const client = await pool.connect();
  try {
    await client.query("select 1");
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(cb: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await cb(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
