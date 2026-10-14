import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, products, rupiah } from "@/lib/catalog";
import { db } from "@/lib/db";
import OrderForm from "./order-form";

export const instant = false;

export default async function ProductPage({ params }: PageProps<"/produk/[slug]">) {
  const { slug } = await params;
  let product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  let options: { id: string; name: string; isRequired: boolean; values: { id: string; name: string; priceAdjustment: number }[] }[] = [];
  let minimumOrder = 1;
  try { const found = await db.product.findFirst({ where:{slug,isActive:true,archivedAt:null,category:{isActive:true,archivedAt:null}}, include:{category:true,options:{where:{isActive:true},orderBy:{sortOrder:"asc"},include:{values:{where:{isActive:true},orderBy:{sortOrder:"asc"}}}}} }); if(found){product={name:found.name,slug:found.slug,category:found.category.name,price:Number(found.basePrice),unit:found.unit,tone:found.tone,tag:found.tag??"",sku:found.sku};minimumOrder=found.minimumOrder;options=found.options.map((option)=>({id:option.id.toString(),name:option.name,isRequired:option.isRequired,values:option.values.map((value)=>({id:value.id.toString(),name:value.name,priceAdjustment:Number(value.priceAdjustment)}))}));} } catch { }
  const category = categories.find((item) => item.name === product.category) ?? {name:product.category,slug:product.category.toLowerCase().replace(/[^a-z0-9]+/g,"-")};
  return <><main className="page-main simple-page"><p className="eyebrow"><span/> <Link href="/katalog">KATALOG</Link> / {product.category.toUpperCase()}</p><section className="product-detail"><div className={`product-art detail-art tone-${product.tone}`}><span className="product-tag">{product.tag || "DMT Print"}</span><span className="art-sheet"><i>DMT / PRINT STUDIO</i><b>YOUR IDEA<br/>IN PRINT</b><small>CREATIVE STUDIO · 2026</small></span><span className="art-index">01 / 08</span></div><div><p className="eyebrow"><span/> {product.category.toUpperCase()}</p><h1 className="page-title">{product.name}</h1><p className="page-subtitle">Produk cetak berkualitas untuk kebutuhan usaha dan personal. Pilihan produk DMT Print dengan hasil rapi dan estimasi pengerjaan yang jelas.</p><p className="detail-price">Mulai dari <b>{rupiah(product.price)}</b> <span style={{fontSize:12,color:"#777"}}>/ {product.unit}</span></p><div className="notice">Harga yang tampil adalah estimasi. Admin akan memeriksa spesifikasi pesanan dan mengirimkan harga final sebelum produksi.</div><OrderForm slug={product.slug} minimumOrder={minimumOrder} options={options}/><p className="page-subtitle">Estimasi produksi: 1–2 hari kerja · Minimum pemesanan: {minimumOrder} {product.unit}</p>{category && <Link className="text-link" href={`/katalog?kategori=${category.slug}`}>Produk lain dalam {category.name} →</Link>}</div></section></main><footer className="site-footer"><Link href="/"><b>DMT PRINT</b></Link><p>Ide hebat layak dicetak sempurna.</p><div><Link href="/katalog">Katalog</Link><Link href="/cek-pesanan">Lacak pesanan</Link></div><small>© 2026 DMT PRINT STUDIO</small></footer></>;
}
