import type { RequestHandler } from "express";
import { pool } from "../db/pool";
import { z } from "zod";

const AccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["asset", "liability", "expense", "income", "equity"]),
});

export const listAccounts: RequestHandler = async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM chart_of_accounts ORDER BY type, name`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};

export const createAccount: RequestHandler = async (req, res) => {
  try {
    const body = AccountSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO chart_of_accounts(name, type) VALUES ($1,$2) ON CONFLICT(name) DO UPDATE SET type=EXCLUDED.type RETURNING *`,
      [body.name, body.type],
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Invalid data" });
  }
};
