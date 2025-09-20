import fs from "fs";
import path from "path";
import { pool } from "./pool";

export async function runMigrations() {
  const schemaPath = path.resolve(__dirname, "./schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  await ensureBaseAccounts();
}

async function ensureBaseAccounts() {
  const base = [
    { name: "Cash", type: "asset" },
    { name: "Bank", type: "asset" },
    { name: "Accounts Receivable", type: "asset" },
    { name: "Inventory", type: "asset" },
    { name: "Accounts Payable", type: "liability" },
    { name: "GST Output", type: "liability" },
    { name: "GST Input", type: "asset" },
    { name: "Sales Revenue", type: "income" },
    { name: "Purchases Expense", type: "expense" },
    { name: "Owner's Equity", type: "equity" },
  ] as const;
  for (const a of base) {
    await pool.query(
      `INSERT INTO chart_of_accounts(name, type)
       VALUES ($1,$2)
       ON CONFLICT (name) DO NOTHING`,
      [a.name, a.type],
    );
  }
}
