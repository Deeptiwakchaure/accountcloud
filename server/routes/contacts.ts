import type { RequestHandler } from "express";
import { pool } from "../db/pool";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["customer", "vendor", "both"]),
  email: z.string().email().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  profile_image: z.string().url().optional().or(z.literal("")),
});

export const listContacts: RequestHandler = async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM contacts ORDER BY created_at DESC LIMIT 200`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};

export const createContact: RequestHandler = async (req, res) => {
  try {
    const body = ContactSchema.parse(req.body);
    const r = await pool.query(
      `INSERT INTO contacts(name, type, email, mobile, address, city, state, pincode, profile_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        body.name,
        body.type,
        body.email || null,
        body.mobile || null,
        body.address || null,
        body.city || null,
        body.state || null,
        body.pincode || null,
        body.profile_image || null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Invalid data" });
  }
};
