-- Initialize schema and base data for docker Postgres
\i '/docker-entrypoint-initdb.d/00-schema.sql'

-- Base accounts (idempotent not possible here; assumes fresh DB)
INSERT INTO chart_of_accounts(name, type) VALUES
  ('Cash','asset'),
  ('Bank','asset'),
  ('Accounts Receivable','asset'),
  ('Inventory','asset'),
  ('Accounts Payable','liability'),
  ('GST Output','liability'),
  ('GST Input','asset'),
  ('Sales Revenue','income'),
  ('Purchases Expense','expense'),
  ('Owner''s Equity','equity');
