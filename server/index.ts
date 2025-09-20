import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { runMigrations } from "./db/migrate";
import { listContacts, createContact } from "./routes/contacts";
import { listProducts, createProduct } from "./routes/products";
import { listTaxes, createTax } from "./routes/taxes";
import { listAccounts, createAccount } from "./routes/accounts";
import { handleHsnSearch } from "./routes/hsn";
import { createSalesOrder, listSalesOrders, createInvoiceFromSO, registerPayment, listInvoices, reportPL, reportBalanceSheet, reportStock } from "./routes/sales";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ensure DB schema
  runMigrations().catch((err) => {
    console.error("Migration error:", err.message);
  });

  // Health
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Demo
  app.get("/api/demo", handleDemo);

  // Master data
  app.get("/api/contacts", listContacts);
  app.post("/api/contacts", createContact);

  app.get("/api/products", listProducts);
  app.post("/api/products", createProduct);

  app.get("/api/taxes", listTaxes);
  app.post("/api/taxes", createTax);

  app.get("/api/accounts", listAccounts);
  app.post("/api/accounts", createAccount);

  // HSN search proxy
  app.get("/api/hsn", handleHsnSearch);

  // Sales flow
  app.post("/api/sales-orders", createSalesOrder);
  app.get("/api/sales-orders", listSalesOrders);
  app.post("/api/invoices/from-so", createInvoiceFromSO);
  app.get("/api/invoices", listInvoices);
  app.post("/api/payments", registerPayment);

  // Reports
  app.get("/api/reports/pl", reportPL);
  app.get("/api/reports/balance-sheet", reportBalanceSheet);
  app.get("/api/reports/stock", reportStock);

  return app;
}
