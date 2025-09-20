import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";

type Contact = { id:number; name:string; type:string };
type Product = { id:number; name:string; sales_price:number };

export default function Index() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const reload = async () => {
    const [c,p,i] = await Promise.all([
      fetch("/api/contacts").then(r=>r.json()).catch(()=>[]),
      fetch("/api/products").then(r=>r.json()).catch(()=>[]),
      fetch("/api/invoices").then(r=>r.json()).catch(()=>[]),
    ]);
    setContacts(c); setProducts(p); setInvoices(i);
  };
  useEffect(()=>{ reload(); },[]);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickCreate onCreated={reload} />
        <HsnSearch />
        <SalesFlow contacts={contacts} products={products} onChanged={reload} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Recent Invoices</h2>
        <div className="rounded-xl border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv)=> (
                <tr key={inv.id} className="border-t">
                  <td className="p-2">INV-{inv.id}</td>
                  <td className="p-2">{inv.customer_id}</td>
                  <td className="p-2"><span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border">{inv.status}</span></td>
                  <td className="p-2 text-right">₹{Number(inv.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

function Field({label, children}:{label:string; children:React.ReactNode}){
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function QuickCreate({ onCreated }:{ onCreated: () => void }){
  const [contact, setContact] = useState({ name:"", type:"customer" });
  const [product, setProduct] = useState({ name:"", type:"goods", sales_price:0, purchase_price:0, hsn_code:"" });
  const [tax, setTax] = useState({ name:"GST 5%", method:"percentage", rate:5, applies_on:"both" });

  async function submit(url:string, body:any){
    await fetch(url,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)});
    onCreated();
  }

  return (
    <section className="rounded-xl border p-4 bg-card">
      <h2 className="font-semibold mb-3">Quick Create</h2>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="font-medium mb-2">Contact</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><input className="w-full border rounded-md px-2 py-1" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/></Field>
            <Field label="Type">
              <select className="w-full border rounded-md px-2 py-1" value={contact.type} onChange={e=>setContact({...contact,type:e.target.value})}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="both">Both</option>
              </select>
            </Field>
          </div>
          <button className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5" onClick={()=>submit('/api/contacts',contact)}>Save Contact</button>
        </div>

        <div className="border-t pt-3">
          <div className="font-medium mb-2">Tax</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><input className="w-full border rounded-md px-2 py-1" value={tax.name} onChange={e=>setTax({...tax,name:e.target.value})}/></Field>
            <Field label="Rate"><input type="number" className="w-full border rounded-md px-2 py-1" value={tax.rate} onChange={e=>setTax({...tax,rate:Number(e.target.value)})}/></Field>
          </div>
          <button className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5" onClick={()=>submit('/api/taxes',tax)}>Save Tax</button>
        </div>

        <div className="border-t pt-3">
          <div className="font-medium mb-2">Product</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><input className="w-full border rounded-md px-2 py-1" value={product.name} onChange={e=>setProduct({...product,name:e.target.value})}/></Field>
            <Field label="HSN Code"><input className="w-full border rounded-md px-2 py-1" value={product.hsn_code} onChange={e=>setProduct({...product,hsn_code:e.target.value})}/></Field>
            <Field label="Sales Price"><input type="number" className="w-full border rounded-md px-2 py-1" value={product.sales_price} onChange={e=>setProduct({...product,sales_price:Number(e.target.value)})}/></Field>
            <Field label="Type">
              <select className="w-full border rounded-md px-2 py-1" value={product.type} onChange={e=>setProduct({...product,type:e.target.value})}>
                <option value="goods">Goods</option>
                <option value="service">Service</option>
              </select>
            </Field>
          </div>
          <button className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5" onClick={()=>submit('/api/products',product)}>Save Product</button>
        </div>
      </div>
    </section>
  );
}

function HsnSearch(){
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any[]>([]);
  async function search(){
    if(!q) return;
    const r = await fetch(`/api/hsn?inputText=${encodeURIComponent(q)}&selectedType=${/^[0-9]+$/.test(q)?'byCode':'byDesc'}&category=${/^[0-9]+$/.test(q)?'null':'P'}`);
    const j = await r.json();
    setRes(j?.data ?? []);
  }
  return (
    <section className="rounded-xl border p-4 bg-card">
      <h2 className="font-semibold mb-3">HSN Search</h2>
      <div className="flex gap-2">
        <input placeholder="Enter HSN code or description" className="flex-1 border rounded-md px-3 py-2" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') search(); }}/>
        <button className="rounded-md bg-secondary px-3" onClick={search}>Search</button>
      </div>
      <ul className="mt-3 max-h-56 overflow-auto divide-y">
        {res.map((r)=> (
          <li key={r.c} className="py-2 text-sm flex justify-between"><span className="font-medium">{r.c}</span><span className="text-right">{r.n}</span></li>
        ))}
      </ul>
    </section>
  );
}

function SalesFlow({ contacts, products, onChanged }:{ contacts: Contact[]; products: Product[]; onChanged: () => void }){
  const [customer, setCustomer] = useState<number | "">("");
  const [items, setItems] = useState<{ product_id:number; quantity:number; unit_price:number }[]>([]);
  useEffect(()=>{ if(products[0]) setItems([{ product_id: products[0].id, quantity:1, unit_price:products[0].sales_price }]); },[products]);

  const total = useMemo(()=> items.reduce((s,i)=> s + i.quantity * i.unit_price, 0),[items]);

  async function createSO(){
    if(!customer || items.length===0) return;
    const so = await fetch('/api/sales-orders',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ customer_id: Number(customer), items })}).then(r=>r.json());
    const inv = await fetch('/api/invoices/from-so',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ so_id: so.id })}).then(r=>r.json());
    await fetch('/api/payments',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ invoice_id: inv.id, method:'cash', amount: inv.total })});
    onChanged();
  }

  return (
    <section className="rounded-xl border p-4 bg-card">
      <h2 className="font-semibold mb-3">Quick Sale</h2>
      <Field label="Customer">
        <select className="w-full border rounded-md px-2 py-1" value={customer} onChange={e=>setCustomer(e.target.value as any)}>
          <option value="">Select...</option>
          {contacts.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="mt-3 space-y-2">
        {items.map((it,idx)=> (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <select className="col-span-5 border rounded-md px-2 py-1" value={it.product_id} onChange={e=>{
              const pid = Number(e.target.value); const p = products.find(pp=>pp.id===pid); const arr=[...items]; arr[idx] = { ...arr[idx], product_id: pid, unit_price: p?Number(p.sales_price):0 }; setItems(arr);
            }}>
              {products.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" className="col-span-3 border rounded-md px-2 py-1" value={it.quantity} onChange={e=>{ const arr=[...items]; arr[idx] = { ...arr[idx], quantity:Number(e.target.value) }; setItems(arr); }}/>
            <input type="number" className="col-span-3 border rounded-md px-2 py-1" value={it.unit_price} onChange={e=>{ const arr=[...items]; arr[idx] = { ...arr[idx], unit_price:Number(e.target.value) }; setItems(arr); }}/>
            <button className="col-span-1 text-red-600" onClick={()=> setItems(items.filter((_,i)=>i!==idx))}>×</button>
          </div>
        ))}
        <button className="text-sm underline" onClick={()=> setItems([...items, products[0]?{ product_id: products[0].id, quantity:1, unit_price: Number(products[0].sales_price)}:{ product_id: 0, quantity:1, unit_price:0 }])}>Add item</button>
      </div>
      <div className="mt-4 flex items-center justify-between font-medium">
        <span>Total</span>
        <span>₹{total.toFixed(2)}</span>
      </div>
      <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-1.5" onClick={createSO}>Create Invoice & Mark Paid</button>
    </section>
  );
}
