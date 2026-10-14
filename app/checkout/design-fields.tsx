"use client";

import { useEffect, useState } from "react";

type CartItem={slug:string;quantity:number;options:Record<string,string>};
export default function DesignFields(){const [items,setItems]=useState<CartItem[]>([]);useEffect(()=>{void fetch("/api/cart").then((res)=>res.json()).then((data:{items:CartItem[]})=>setItems(data.items??[])).catch(()=>setItems([]));},[]);return <>{items.map((item)=><div className="field" key={item.slug}><label htmlFor={`design-${item.slug}`}>{item.slug.replaceAll("-"," ")}</label><input id={`design-${item.slug}`} name={`design_${item.slug}`} type="file" accept=".jpg,.jpeg,.png,.pdf,.zip"/><small>File opsional, maksimal 10 MB.</small></div>)}</>;}
