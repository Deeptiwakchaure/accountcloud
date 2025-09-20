import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

export default function Reports() {
  const [pl, setPl] = useState<{ income: number; expenses: number; net: number } | null>(null);
  const [bs, setBs] = useState<any>(null);
  const [stock, setStock] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/reports/pl").then((r) => r.json()).then(setPl).catch(console.error);
    fetch("/api/reports/balance-sheet").then((r) => r.json()).then(setBs).catch(console.error);
    fetch("/api/reports/stock").then((r) => r.json()).then(setStock).catch(console.error);
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border p-4 bg-card">
          <div className="text-sm text-muted-foreground">Income</div>
          <div className="text-2xl font-bold">₹{(pl?.income ?? 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border p-4 bg-card">
          <div className="text-sm text-muted-foreground">Expenses</div>
          <div className="text-2xl font-bold">₹{(pl?.expenses ?? 0).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border p-4 bg-card">
          <div className="text-sm text-muted-foreground">Net Profit</div>
          <div className="text-2xl font-bold">₹{(pl?.net ?? 0).toFixed(2)}</div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Balance Sheet</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Assets</h3>
            <ul className="space-y-1">
              {bs?.assets?.map((a: any) => (
                <li key={a.name} className="flex justify-between"><span>{a.name}</span><span>₹{Number(a.balance).toFixed(2)}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Liabilities</h3>
            <ul className="space-y-1">
              {bs?.liabilities?.map((a: any) => (
                <li key={a.name} className="flex justify-between"><span>{a.name}</span><span>₹{Number(a.balance).toFixed(2)}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-medium mb-2">Equity</h3>
            <ul className="space-y-1">
              {bs?.equity?.map((a: any) => (
                <li key={a.name} className="flex justify-between"><span>{a.name}</span><span>₹{Number(a.balance).toFixed(2)}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Stock</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-right p-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2 text-right">{Number(s.qty).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
