import type { RequestHandler } from "express";
import { pool } from "../db/pool";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["goods", "service"]),
  sales_price: z.coerce.number().nonnegative(),
  purchase_price: z.coerce.number().nonnegative(),
  sale_tax_id: z.number().int().optional().nullable(),
  purchase_tax_id: z.number().int().optional().nullable(),
  hsn_code: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export const listProducts: RequestHandler = async (_req, res) => {
  const r = await pool.query(`SELECT * FROM products ORDER BY created_at DESC LIMIT 200`);
  res.json(r.rows);
};

export const createProduct: RequestHandler = async (req, res) => {
  try {
    const body = ProductSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO products(name, type, sales_price, purchase_price, sale_tax_id, purchase_tax_id, hsn_code, category)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        body.name,
        body.type,
        body.sales_price,
        body.purchase_price,
        body.sale_tax_id ?? null,
        body.purchase_tax_id ?? null,
        body.hsn_code ?? null,
        body.category ?? null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Invalid data" });
  }
};
