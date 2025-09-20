import type { RequestHandler } from "express";
import { withTransaction, pool } from "../db/pool";
import { z } from "zod";
import { getAccountId, postLedger } from "../lib/accounting";

const SOItem = z.object({ product_id: z.number().int(), quantity: z.coerce.number().positive(), unit_price: z.coerce.number().nonnegative(), tax_id: z.number().int().nullable().optional() });
const SOCreate = z.object({ customer_id: z.number().int(), items: z.array(SOItem).min(1) });

export const createSalesOrder: RequestHandler = async (req, res) => {
  try {
    const body = SOCreate.parse(req.body);
    const result = await withTransaction(async (client) => {
      const so = await client.query(
        `INSERT INTO sales_orders(customer_id, status) VALUES ($1,'confirmed') RETURNING *`,
        [body.customer_id],
      );
      for (const it of body.items) {
        await client.query(
          `INSERT INTO sales_order_items(so_id, product_id, quantity, unit_price, tax_id) VALUES ($1,$2,$3,$4,$5)`,
          [so.rows[0].id, it.product_id, it.quantity, it.unit_price, it.tax_id ?? null],
        );
      }
      return so.rows[0];
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Invalid data" });
  }
};

export const listSalesOrders: RequestHandler = async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM sales_orders ORDER BY created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};

const InvoiceFromSO = z.object({ so_id: z.number().int(), due_date: z.string().optional() });

export const createInvoiceFromSO: RequestHandler = async (req, res) => {
  try {
    const { so_id, due_date } = InvoiceFromSO.parse(req.body);

    const invoice = await withTransaction(async (client) => {
      const so = await client.query(`SELECT * FROM sales_orders WHERE id=$1`, [so_id]);
      if (!so.rowCount) throw new Error("Sales order not found");

      const items = await client.query(
        `SELECT soi.*, p.name as product_name, t.method as tax_method, t.rate as tax_rate
         FROM sales_order_items soi
         LEFT JOIN products p ON p.id=soi.product_id
         LEFT JOIN taxes t ON t.id=soi.tax_id
         WHERE so_id=$1`,
        [so_id],
      );

      let subtotal = 0; let taxTotal = 0;
      for (const it of items.rows) {
        const line = Number(it.quantity) * Number(it.unit_price);
        subtotal += line;
        if (it.tax_rate) {
          taxTotal += it.tax_method === 'percentage' ? (line * Number(it.tax_rate)) / 100 : Number(it.tax_rate);
        }
      }
      const total = subtotal + taxTotal;

      const inv = await client.query(
        `INSERT INTO invoices(so_id, customer_id, status, total, tax_total, due_date)
         VALUES ($1,$2,'unpaid',$3,$4,$5) RETURNING *`,
        [so_id, so.rows[0].customer_id, total, taxTotal, due_date ?? null],
      );
      const invoiceId = inv.rows[0].id as number;
      for (const it of items.rows) {
        await client.query(
          `INSERT INTO invoice_items(invoice_id, product_id, description, quantity, unit_price, tax_id)
           VALUES ($1,$2,$3,$4,$5,$6)` ,
          [invoiceId, it.product_id, it.product_name, it.quantity, it.unit_price, it.tax_id ?? null],
        );
      }

      // Ledger: AR debit, Sales credit, GST Output credit
      const ar = await getAccountId(client, 'Accounts Receivable');
      const sales = await getAccountId(client, 'Sales Revenue');
      const gstOut = await getAccountId(client, 'GST Output');

      await postLedger(client, [
        { account_id: ar, debit: total, ref_type: 'invoice', ref_id: invoiceId },
        { account_id: sales, credit: subtotal, ref_type: 'invoice', ref_id: invoiceId },
        ...(taxTotal > 0 ? [{ account_id: gstOut, credit: taxTotal, ref_type: 'invoice', ref_id: invoiceId }] : []),
      ]);

      // Stock out for goods
      const goods = await client.query(
        `SELECT ii.product_id, ii.quantity, p.type FROM invoice_items ii JOIN products p ON p.id=ii.product_id WHERE invoice_id=$1`,
        [invoiceId],
      );
      for (const g of goods.rows) {
        if (g.type === 'goods') {
          await client.query(
            `INSERT INTO stock_movements(product_id, quantity, direction, ref_type, ref_id) VALUES ($1,$2,'out','invoice',$3)` ,
            [g.product_id, g.quantity, invoiceId],
          );
        }
      }

      return inv.rows[0];
    });

    res.status(201).json(invoice);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Cannot create invoice" });
  }
};

const PaymentSchema = z.object({ invoice_id: z.number().int(), method: z.enum(["cash","bank"]), amount: z.coerce.number().positive() });

export const registerPayment: RequestHandler = async (req, res) => {
  try {
    const { invoice_id, method, amount } = PaymentSchema.parse(req.body);
    const result = await withTransaction(async (client) => {
      const inv = await client.query(`SELECT * FROM invoices WHERE id=$1`, [invoice_id]);
      if (!inv.rowCount) throw new Error("Invoice not found");

      const accountName = method === 'cash' ? 'Cash' : 'Bank';
      const ar = await getAccountId(client, 'Accounts Receivable');
      const acc = await getAccountId(client, accountName);

      await client.query(
        `INSERT INTO payments(invoice_id, account_id, method, amount) VALUES ($1,$2,$3,$4)` ,
        [invoice_id, acc, method, amount],
      );

      await postLedger(client, [
        { account_id: acc, debit: amount, ref_type: 'payment', ref_id: invoice_id },
        { account_id: ar, credit: amount, ref_type: 'payment', ref_id: invoice_id },
      ]);

      // Update invoice status if fully paid
      const paid = await client.query(`SELECT COALESCE(SUM(amount),0) as paid FROM payments WHERE invoice_id=$1`, [invoice_id]);
      const isPaid = Number(paid.rows[0].paid) >= Number(inv.rows[0].total);
      if (isPaid) {
        await client.query(`UPDATE invoices SET status='paid' WHERE id=$1`, [invoice_id]);
      }
      return { status: isPaid ? 'paid' : 'partial' };
    });

    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "Cannot register payment" });
  }
};

export const listInvoices: RequestHandler = async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100`);
    res.json(r.rows);
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};

// Reports
const Period = z.object({ from: z.string().optional(), to: z.string().optional() });

export const reportPL: RequestHandler = async (req, res) => {
  try {
    const { from, to } = Period.parse(req.query);
    const params: any[] = [];
    let where = "";
    if (from) { where += (where?" AND ":" ") + `created_at >= $${params.length+1}`; params.push(from); }
    if (to) { where += (where?" AND ":" ") + `created_at <= $${params.length+1}`; params.push(to); }

    const income = await pool.query(`SELECT COALESCE(SUM(credit - debit),0) as amount FROM ledger_entries le JOIN chart_of_accounts a ON a.id=le.account_id WHERE a.type='income'${where?" AND "+where:""}`, params);
    const expenses = await pool.query(`SELECT COALESCE(SUM(debit - credit),0) as amount FROM ledger_entries le JOIN chart_of_accounts a ON a.id=le.account_id WHERE a.type='expense'${where?" AND "+where:""}`, params);
    res.json({ income: Number(income.rows[0].amount), expenses: Number(expenses.rows[0].amount), net: Number(income.rows[0].amount) - Number(expenses.rows[0].amount) });
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};

export const reportBalanceSheet: RequestHandler = async (_req, res) => {
  try {
    const assets = await pool.query(`SELECT a.name, COALESCE(SUM(le.debit - le.credit),0) AS balance FROM chart_of_accounts a LEFT JOIN ledger_entries le ON le.account_id=a.id WHERE a.type='asset' GROUP BY a.id ORDER BY a.name`);
    const liabilities = await pool.query(`SELECT a.name, COALESCE(SUM(le.credit - le.debit),0) AS balance FROM chart_of_accounts a LEFT JOIN ledger_entries le ON le.account_id=a.id WHERE a.type='liability' GROUP BY a.id ORDER BY a.name`);
    const equity = await pool.query(`SELECT a.name, COALESCE(SUM(le.credit - le.debit),0) AS balance FROM chart_of_accounts a LEFT JOIN ledger_entries le ON le.account_id=a.id WHERE a.type='equity' GROUP BY a.id ORDER BY a.name`);
    res.json({ assets: assets.rows, liabilities: liabilities.rows, equity: equity.rows });
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};

export const reportStock: RequestHandler = async (_req, res) => {
  try {
    const q = await pool.query(`SELECT p.id, p.name,
      COALESCE(SUM(CASE WHEN sm.direction='in' THEN sm.quantity ELSE 0 END),0) -
      COALESCE(SUM(CASE WHEN sm.direction='out' THEN sm.quantity ELSE 0 END),0) as qty
      FROM products p LEFT JOIN stock_movements sm ON sm.product_id=p.id GROUP BY p.id ORDER BY p.name`);
    res.json(q.rows);
  } catch (e: any) {
    res.status(503).json({ error: "Database unavailable" });
  }
};
