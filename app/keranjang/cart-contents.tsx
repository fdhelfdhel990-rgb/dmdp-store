"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { rupiah } from "@/lib/catalog";

type CartItem={slug:string;quantity:number;options:Record<string,string>;product?:{name:string;category:string;unit:string;price:number;minimumOrder:number};selected:{name:string;value:string;priceAdjustment:number}[]};
export default function CartContents(){
 const [items,setItems]=useState<CartItem[]>([]);const [ready,setReady]=useState(false);const [error,setError]=useState("");
 const refresh=useCallback(()=>fetch("/api/cart").then((r)=>r.json()).then((data:{items?:CartItem[]})=>{setItems(data.items??[]);setReady(true);}).catch(()=>setReady(true)),[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function update(slug:string,quantity:number){const response=await fetch("/api/cart",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,quantity})});const data=await response.json() as {items:CartItem[];error?:string};if(!response.ok){setError(data.error??"Jumlah belum berhasil diperbarui.");return;}setError("");await refresh();}
 const visible=items.filter((item)=>item.product);const subtotal=visible.reduce((sum,item)=>sum+item.product!.price*item.quantity,0);
 if(!ready)return <div className="simple-card empty-state">Memuat keranjang…</div>;
 if(!visible.length)return <div className="simple-card empty-state"><b>Keranjang masih kosong</b>Pilih produk cetak yang kamu perlukan dari katalog.<p><Link className="button button-primary" href="/katalog">Lihat katalog</Link></p></div>;
 return <div className="simple-card">{error&&<p role="alert" className="notice">{error}</p>}<table className="order-table"><thead><tr><th>Produk</th><th>Harga</th><th>Jumlah</th><th>Total</th><th></th></tr></thead><tbody>{visible.map((item)=>{const product=item.product!;return <tr key={`${item.slug}-${Object.values(item.options).join("-")}`}><td><b>{product.name}</b><br/><span style={{color:"#858980"}}>{product.category}</span>{item.selected.length>0&&<small style={{display:"block",color:"#858980"}}>{item.selected.map((option)=>`${option.name}: ${option.value}`).join(" · ")}</small>}</td><td>{rupiah(product.price)}</td><td><input aria-label={`Jumlah ${product.name}`} type="number" min={product.minimumOrder} max="999" value={item.quantity} onChange={(event)=>void update(item.slug,Number(event.target.value))} style={{width:65,padding:7}}/> {product.unit}</td><td><b>{rupiah(product.price*item.quantity)}</b></td><td><button className="table-link" onClick={()=>void update(item.slug,0)}>Hapus</button></td></tr>;})}</tbody></table><div className="order-total">Estimasi total: {rupiah(subtotal)}</div><div className="notice">Harga estimasi diperbarui dari katalog. Harga final dikonfirmasi admin sebelum produksi.</div><Link href="/checkout" className="button button-primary">Lanjutkan ke pemesanan <span>↗</span></Link></div>;
}
