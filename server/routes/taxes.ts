import type { RequestHandler } from "express";
import { pool } from "../db/pool";
import { z } from "zod";

const TaxSchema = z.object({
  name: z.string().min(1),
  method: z.enum(["percentage", "fixed"]),
  rate: z.coerce.number().nonnegative(),
  applies_on: z.enum(["sales", "purchase", "both"]).default("both"),
});

export const listTaxes: RequestHandler = async (_req, res) => {
  const r = await pool.query(`SELECT * FROM taxes ORDER BY id ASC`);
  res.json(r.rows);
};

export const createTax: RequestHandler = async (req, res) => {
  try {
    const body = TaxSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO taxes(name, method, rate, applies_on) VALUES ($1,$2,$3,$4) RETURNING *`,
      [body.name, body.method, body.rate, body.applies_on],
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Invalid data" });
  }
};
