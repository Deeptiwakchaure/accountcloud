import { PoolClient } from "pg";

export async function getAccountId(client: PoolClient, name: string) {
  const r = await client.query(
    `SELECT id FROM chart_of_accounts WHERE name=$1 LIMIT 1`,
    [name],
  );
  if (r.rowCount) return r.rows[0].id as number;
  throw new Error(`Account '${name}' not found`);
}

export async function postLedger(
  client: PoolClient,
  entries: { account_id: number; debit?: number; credit?: number; ref_type?: string; ref_id?: number }[],
) {
  for (const e of entries) {
    await client.query(
      `INSERT INTO ledger_entries(account_id, ref_type, ref_id, debit, credit)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        e.account_id,
        e.ref_type ?? null,
        e.ref_id ?? null,
        Number(e.debit ?? 0),
        Number(e.credit ?? 0),
      ],
    );
  }
}
