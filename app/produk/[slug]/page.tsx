import Link from "next/link";
import { notFound } from "next/navigation";
import CustomerShell from "../../_components/customer-shell";
import { products as starterProducts, rupiah } from "@/lib/catalog";
import { db } from "@/lib/db";
import OrderForm from "./order-form";

export const instant=false;
type Option={id:string;name:string;isRequired:boolean;values:{id:string;name:string;priceAdjustment:number}[]};

export default async function ProductPage({params}:PageProps<"/produk/[slug]">){
  const {slug}=await params;let product=starterProducts.find((item)=>item.slug===slug);let options:Option[]=[];let minimumOrder=1;let production="1–2 hari kerja";
  try{const found=await db.product.findFirst({where:{slug,isActive:true,archivedAt:null,category:{isActive:true,archivedAt:null}},include:{category:true,options:{where:{isActive:true},orderBy:{sortOrder:"asc"},include:{values:{where:{isActive:true},orderBy:{sortOrder:"asc"}}}}}});if(found){product={name:found.name,slug:found.slug,category:found.category.name,price:Number(found.basePrice),unit:found.unit,tone:found.tone,tag:found.tag??"",sku:found.sku};minimumOrder=found.minimumOrder;production=found.productionEstimate??production;options=found.options.map((option)=>({id:option.id.toString(),name:option.name,isRequired:option.isRequired,values:option.values.map((value)=>({id:value.id.toString(),name:value.name,priceAdjustment:Number(value.priceAdjustment)}))}));}}catch{/* allow bundled products to render offline */}
  if(!product)notFound();
  const categorySlug=product.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return <CustomerShell><section className="page-section product-detail-page"><div className="site-container"><div className="breadcrumb-bar"><Link href="/">Beranda</Link><span>›</span><Link href="/katalog">Katalog</Link><span>›</span><b>{product.category}</b></div><div className="product-detail-grid"><div className="product-gallery"><div className={`product-main-art tone-${product.tone}`}><span className="print-sheet large"><b>{product.name}</b><small>DMT PRINT</small></span></div></div><div className="product-config"><p className="eyebrow blue">{product.category}</p><h1>{product.name}</h1><p className="muted">Produk cetak DMT Print untuk kebutuhan usaha, sekolah, organisasi, dan personal.</p><p className="product-price"><small>Mulai dari</small> {rupiah(product.price)}<span>/{product.unit}</span></p><div className="panel accent-panel"><p>Harga ini merupakan estimasi. Admin akan memeriksa spesifikasi dan mengonfirmasi harga final sebelum produksi.</p><OrderForm slug={product.slug} minimumOrder={minimumOrder} options={options}/></div><p className="muted">Estimasi pengerjaan: {production} · Minimum pemesanan: {minimumOrder} {product.unit}</p><Link href={`/katalog?kategori=${categorySlug}`} className="text-button">Produk lain dalam {product.category} →</Link></div></div></div></section></CustomerShell>;
}
