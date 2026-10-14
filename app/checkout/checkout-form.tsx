"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DesignFields from "./design-fields";

export default function CheckoutForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { orderNumber?: string; error?: string };
      if (!response.ok || !result.orderNumber) throw new Error(result.error || "Pesanan belum berhasil dibuat.");
      router.push(`/status-pesanan/${encodeURIComponent(result.orderNumber)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Terjadi kesalahan."); }
    finally { setBusy(false); }
  }
  return <form className="simple-card" onSubmit={submit}>
    <div className="form-grid"><div className="field"><label htmlFor="name">Nama lengkap</label><input id="name" name="name" autoComplete="name" required/></div><div className="field"><label htmlFor="phone">Nomor WhatsApp</label><input id="phone" name="phone" type="tel" autoComplete="tel" required/></div><div className="field" style={{gridColumn:"1 / -1"}}><label htmlFor="email">Email (opsional)</label><input id="email" name="email" type="email" autoComplete="email"/></div><div className="field" style={{gridColumn:"1 / -1"}}><label htmlFor="customer_note">Catatan pesanan</label><textarea id="customer_note" name="customer_note"/></div></div>
    <h2 style={{fontSize:15,marginTop:25}}>Cara menerima pesanan</h2><div className="form-grid"><div className="field"><label htmlFor="fulfillment">Metode</label><select id="fulfillment" name="fulfillment_method" defaultValue="shipping"><option value="shipping">Pengiriman</option><option value="pickup">Ambil sendiri</option></select></div><div className="field"><label htmlFor="shipping_region">Kota/kabupaten</label><input id="shipping_region" name="shipping_region" autoComplete="address-level2"/></div><div className="field" style={{gridColumn:"1 / -1"}}><label htmlFor="shipping_address">Alamat lengkap</label><textarea id="shipping_address" name="shipping_address" autoComplete="street-address"/></div><div className="field"><label htmlFor="postal_code">Kode pos (opsional)</label><input id="postal_code" name="postal_code" autoComplete="postal-code"/></div><div className="field"><label htmlFor="address_note">Catatan alamat (opsional)</label><input id="address_note" name="address_note" placeholder="Patokan atau instruksi kurir"/></div><div id="design-fields" className="field" style={{gridColumn:"1 / -1"}}><label>File desain (JPG, PNG, PDF, ZIP; maksimal 10 MB)</label><DesignFields/></div></div>
    <label style={{display:"flex",gap:10,fontSize:10,lineHeight:1.7,margin:"14px 0 18px"}}><input type="checkbox" name="approved" required/>Saya memahami harga masih berupa estimasi dan harga final ditentukan admin setelah pemeriksaan.</label>
    {error && <p role="alert" className="notice">{error}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? "Mengirim pesanan…" : "Buat pesanan ↗"}</button>
  </form>;
}
