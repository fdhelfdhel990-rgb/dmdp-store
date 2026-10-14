"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string; isRequired: boolean; values: { id: string; name: string; priceAdjustment: number }[] };

export default function OrderForm({ slug, minimumOrder, options }: { slug: string; minimumOrder: number; options: Option[] }) {
  const [quantity, setQuantity] = useState(minimumOrder);
  const [selected, setSelected] = useState<Record<string,string>>({});
  const [error,setError]=useState("");
  const router = useRouter();
  async function add() {
    if(options.some((option)=>option.isRequired&&!selected[option.id])){setError("Pilih semua spesifikasi yang wajib diisi.");return;}
    const response = await fetch("/api/cart", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({slug,quantity,options:selected}) });
    if (response.ok) router.push("/keranjang"); else setError("Produk atau jumlah pesanan tidak tersedia.");
  }
  return <div className="simple-card">{options.map((option)=><div className="field" key={option.id}><label>{option.name}{option.isRequired?" *":" (opsional)"}</label><select required={option.isRequired} value={selected[option.id]??""} onChange={(event)=>setSelected({...selected,[option.id]:event.target.value})}><option value="">Pilih {option.name.toLowerCase()}</option>{option.values.map((value)=><option key={value.id} value={value.id}>{value.name}{value.priceAdjustment?` · +Rp ${value.priceAdjustment.toLocaleString("id-ID")}`:""}</option>)}</select></div>)}<div className="field"><label htmlFor="quantity">Jumlah</label><input id="quantity" type="number" min={minimumOrder} max="999" value={quantity} onChange={(event)=>setQuantity(Number(event.target.value))}/></div>{error&&<p role="alert" className="notice">{error}</p>}<button className="button button-primary" type="button" onClick={()=>void add()}>Tambahkan ke keranjang <span>↗</span></button></div>;
}
