import Link from "next/link";
import { categories, products, rupiah } from "@/lib/catalog";
import { db } from "@/lib/db";

export const instant = false;

export default async function CatalogPage({ searchParams }: PageProps<"/katalog">) {
  const params = await searchParams;
  let catalogCategories = categories;
  let catalogProducts = products;
  try {
    const [rows, allCategories] = await Promise.all([
      db.product.findMany({ where: { isActive: true, archivedAt: null, category: { isActive: true, archivedAt: null } }, include: { category: true }, orderBy: { sortOrder: "asc" } }),
      db.category.findMany({ where: { isActive: true, archivedAt: null }, orderBy: { sortOrder: "asc" } }),
    ]);
    if (rows.length) catalogProducts = rows.map((row) => ({name:row.name,slug:row.slug,category:row.category.name,price:Number(row.basePrice),unit:row.unit,tone:row.tone,tag:row.tag??"",sku:row.sku}));
    if (allCategories.length) catalogCategories = allCategories.map((item) => ({name:item.name,slug:item.slug,icon:"✦"}));
  } catch { /* render bundled starter catalog until the database is configured */ }
  const category = typeof params.kategori === "string" ? params.kategori : "";
  const search = typeof params.q === "string" ? params.q : "";
  const selected = catalogCategories.find((item) => item.slug === category);
  const filtered = catalogProducts.filter((product) => (!selected || product.category === selected.name) && (!search || `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())));
  return <><main className="page-main catalog-page"><p className="eyebrow"><span/> DMT PRINT · KATALOG</p><h1 className="page-title">Semua yang perlu<br/>dicetak <em>ada di sini.</em></h1><p className="page-subtitle">Produk cetak dan custom merchandise untuk bikin ide kamu terlihat.</p><div className="catalog-tools"><div className="filter-list"><Link className={`filter-pill ${!category ? "active" : ""}`} href="/katalog">Semua produk</Link>{catalogCategories.map((item) => <Link key={item.slug} className={`filter-pill ${category === item.slug ? "active" : ""}`} href={`/katalog?kategori=${item.slug}`}>{item.name}</Link>)}</div><form className="search-form"><input name="q" defaultValue={search} placeholder="Cari produk..."/><button aria-label="Cari">⌕</button></form></div>{filtered.length ? <div className="product-grid catalog-grid">{filtered.map((product, index) => <Link className="product-card" href={`/produk/${product.slug}`} key={product.slug}><div className={`product-art tone-${product.tone}`}><span className="product-tag">{product.tag || "DMT Print"}</span><span className="art-sheet"><i>DMT / STUDIO</i><b>{index % 2 ? "MAKE IT\nMEMORABLE" : "YOUR IDEA\nIN PRINT"}</b><small>CREATIVE STUDIO · 2026</small></span><span className="art-index">0{index + 1}</span></div><div className="product-info"><span>{product.category}</span><h3>{product.name}</h3><p>Mulai dari <strong>{rupiah(product.price)}</strong> <small>/ {product.unit}</small></p></div></Link>)}</div> : <div className="empty-state"><b>Produk belum ditemukan</b>Coba kata pencarian atau kategori lainnya.</div>}</main><footer className="site-footer"><Link href="/"><b>DMT PRINT</b></Link><p>Ide hebat layak dicetak sempurna.</p><div><Link href="/">Beranda</Link><Link href="/cek-pesanan">Lacak Pesanan</Link></div><small>© 2026 DMT PRINT STUDIO</small></footer></>;
}
