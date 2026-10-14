import Image from "next/image";
import Link from "next/link";
import CustomerShell from "./_components/customer-shell";
import { db } from "@/lib/db";
import { products as starterProducts, categories as starterCategories, rupiah } from "@/lib/catalog";
import { publicFileUrl } from "@/lib/r2";
import { connection } from "next/server";

export const instant = false;

type CatalogProduct = {name:string;slug:string;category:string;price:number;unit:string;tone:string;tag:string};
type CatalogCategory = {name:string;slug:string};

function ProductCard({product}:{product:CatalogProduct}) {
  return <article className="product-card"><Link href={`/produk/${product.slug}`} className={`product-art tone-${product.tone}`}>{product.tag&&<span className="product-tag">{product.tag}</span>}<span className="print-sheet"><b>{product.name}</b><small>DMT PRINT</small></span></Link><div className="product-card-body"><p className="product-category">{product.category}</p><h3><Link href={`/produk/${product.slug}`}>{product.name}</Link></h3><p className="product-price"><small>Mulai</small> {rupiah(product.price)}<span>/{product.unit}</span></p><Link href={`/produk/${product.slug}`} className="product-card-cta">Lihat detail</Link></div></article>;
}

export default async function Home() {
  await connection();
  let catalogProducts:CatalogProduct[]=starterProducts.map((product)=>({...product,tag:product.tag??""}));
  let catalogCategories:CatalogCategory[]=starterCategories;
  let banner:{title:string;description:string|null;buttonLabel:string|null;buttonUrl:string|null;imageUrl:string|null}|null=null;
  try {
    const [rows,cats,hero] = await Promise.all([
      db.product.findMany({where:{isActive:true,isFeatured:true,archivedAt:null,category:{isActive:true,archivedAt:null}},include:{category:true},orderBy:{sortOrder:"asc"},take:4}),
      db.category.findMany({where:{isActive:true,archivedAt:null},orderBy:{sortOrder:"asc"}}),
      db.banner.findFirst({where:{isActive:true,archivedAt:null},orderBy:{sortOrder:"asc"}}),
    ]);
    if(rows.length)catalogProducts=rows.map((row)=>({name:row.name,slug:row.slug,category:row.category.name,price:Number(row.basePrice),unit:row.unit,tone:row.tone,tag:row.tag??""}));
    if(cats.length)catalogCategories=cats;
    if(hero){let imageUrl:string|null=null;try{if(hero.imagePath)imageUrl=publicFileUrl(hero.imagePath);}catch{/* public media domain not configured */}banner={title:hero.title,description:hero.description,buttonLabel:hero.buttonLabel,buttonUrl:hero.buttonUrl,imageUrl};}
  }catch{/* the bundled catalogue keeps the storefront usable while Supabase is unavailable */}
  return <CustomerShell><main>
    <section className="hero-slider"><article className="hero-slide active"><div className="site-container hero-slide-inner">{banner?.imageUrl?<div className="hero-art-fallback" style={{position:"relative",overflow:"hidden"}}><Image src={banner.imageUrl} alt={banner.title} fill priority style={{objectFit:"cover"}}/><span className="sr-only">{banner.description}</span></div>:<div className="hero-art-fallback"><div className="hero-fallback-brand"><span className="hero-fallback-mark">d</span><b>DMT PRINT</b><small>{banner?.title||"Semua kebutuhan cetak dalam satu tempat"}</small></div></div>}{banner?.buttonUrl&&banner.buttonLabel&&<Link className="button button-yellow hero-banner-cta" href={banner.buttonUrl}>{banner.buttonLabel}</Link>}</div></article></section>
    <section className="category-strip"><div className="site-container category-list">{catalogCategories.slice(0,8).map((category,index)=><Link href={`/katalog?kategori=${category.slug}`} className="category-item" key={category.slug}><span className={`category-icon icon-shape-${index%4+1}`} aria-hidden="true"/><span>{category.name}</span></Link>)}</div></section>
    <section className="page-section"><div className="site-container"><div className="section-heading"><div><p className="eyebrow blue">Pilihan populer</p><h2>Produk unggulan</h2></div><Link href="/katalog">Lihat semua <span>→</span></Link></div><div className="product-grid">{catalogProducts.slice(0,4).map((product)=><ProductCard product={product} key={product.slug}/>)}</div></div></section>
    <section className="page-section"><div className="site-container promo-band-grid"><div className="promo-poster"><small>DMT PRINT</small><strong>Ide Anda.<br/><span>Hasil cetak.</span></strong><small>Digital printing untuk usaha dan kebutuhan personal.</small></div><div><p className="eyebrow blue">Butuh bantuan memilih?</p><h2>Temukan produk cetak yang sesuai</h2><p>Jelajahi produk dan pilih spesifikasi yang Anda perlukan. Admin kami akan membantu memastikan hasilnya tepat.</p><Link href="/katalog" className="button button-primary">Lihat katalog</Link><div className="benefit-row"><span><b>✓</b> Harga estimasi jelas</span><span><b>✓</b> Konsultasi admin</span></div></div></div></section>
    <section className="page-section"><div className="site-container"><div className="section-heading"><div><p className="eyebrow blue">Lengkapi kebutuhan Anda</p><h2>Produk lainnya</h2></div></div><div className="product-grid">{catalogProducts.slice(4,8).map((product)=><ProductCard product={product} key={product.slug}/>)}</div></div></section>
    <section className="how-section"><div className="site-container"><div className="section-heading centered"><div><p className="eyebrow blue">Mudah dan jelas</p><h2>Cara memesan</h2></div></div><div className="steps-grid"><article><span>1</span><h3>Pilih produk</h3><p>Tentukan ukuran, bahan, finishing, dan jumlah.</p></article><article><span>2</span><h3>Kirim detail</h3><p>Isi data serta unggah desain atau tautan file.</p></article><article><span>3</span><h3>Konfirmasi harga</h3><p>Admin memeriksa dan menetapkan harga final.</p></article><article><span>4</span><h3>Produksi</h3><p>Pantau status sampai siap diambil atau dikirim.</p></article></div></div></section>
  </main></CustomerShell>;
}
