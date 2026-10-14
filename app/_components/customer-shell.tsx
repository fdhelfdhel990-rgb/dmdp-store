import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { categories as starterCategories } from "@/lib/catalog";

type Setting = Record<string, unknown>;

export default async function CustomerShell({ children }: { children: React.ReactNode }) {
  await connection();
  let categories: { name: string; slug: string }[] = starterCategories;
  let business: Setting = {};
  let social: Setting = {};
  let paymentMethods: string[] = ["Transfer", "QRIS", "Cash"];
  try {
    const [categoryRows, settings, methods] = await Promise.all([
      db.category.findMany({ where: { isActive: true, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
      db.siteSetting.findMany({ where: { key: { in: ["business", "social"] } } }),
      db.paymentMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true } }),
    ]);
    categories = categoryRows;
    business = (settings.find((setting) => setting.key === "business")?.value as Setting | undefined) ?? {};
    social = (settings.find((setting) => setting.key === "social")?.value as Setting | undefined) ?? {};
    if (methods.length) paymentMethods = methods.map((method) => method.name);
  } catch { /* keep storefront usable from its bundled catalog when the database is offline */ }

  const jar = await cookies();
  let cartQuantity = 0;
  try { cartQuantity = (JSON.parse(jar.get("dmt_cart")?.value ?? "[]") as { quantity?: number }[]).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0); } catch { /* ignore a malformed cart cookie */ }
  const phone = typeof business.phone === "string" ? business.phone : "";
  const address = typeof business.address === "string" ? business.address : "Hubungi kami untuk informasi alamat.";
  const hours = typeof business.opening_hours === "string" ? business.opening_hours : "Senin–Sabtu, 08.00–17.00 WIB";
  const instagram = typeof social.instagram === "string" ? social.instagram : "";
  const tiktok = typeof social.tiktok === "string" ? social.tiktok : "";

  return <>
    <header className="store-header">
      <div className="site-container header-main">
        <Link href="/" className="brand" aria-label="DMT Print beranda"><span className="brand-mark">d</span><span><b>DMT</b> Print<small>Darul Muttaqien Printing</small></span></Link>
        <form className="header-search" action="/katalog"><label className="sr-only" htmlFor="global-search">Cari produk</label><input id="global-search" name="q" placeholder="Cari produk cetak..."/><button aria-label="Cari"><span className="icon icon-search"/></button></form>
        <nav className="header-actions" aria-label="Tautan cepat"><Link href="/cek-pesanan" className="track-link">Cek Pesanan</Link><Link href="/keranjang" className="cart-link" aria-label="Keranjang"><span className="icon-cart"/>{cartQuantity > 0 && <span className="cart-count">{cartQuantity}</span>}</Link></nav>
      </div>
      <nav className="category-nav"><div className="site-container category-nav-inner"><Link href="/">Beranda</Link><Link href="/katalog">Katalog</Link>{categories.map((category) => <Link href={`/katalog?kategori=${category.slug}`} key={category.slug}>{category.name}</Link>)}<Link href="/cek-pesanan" className="mobile-only">Cek Pesanan</Link><Link href="/keranjang" className="mobile-only">Keranjang {cartQuantity ? `(${cartQuantity})` : ""}</Link></div></nav>
    </header>
    {children}
    <footer className="store-footer"><div className="site-container footer-grid">
      <section><h3>DMT Print</h3><p>Layanan cetak untuk kebutuhan sekolah, usaha, organisasi, dan acara Anda.</p><div className="footer-links"><Link href="/">Tentang kami</Link><Link href="/katalog">Katalog</Link><Link href="/cek-pesanan">Status pesanan</Link></div></section>
      <section><h3>Kontak</h3><p>{address}</p><p>{hours}</p>{phone && <p>WhatsApp: {phone}</p>}</section>
      <section><h3>Metode Pembayaran</h3><div className="payment-logos">{paymentMethods.map((method) => <span key={method}>{method}</span>)}</div><p>Metode pembayaran aktif tersedia saat konfirmasi pesanan.</p></section>
      <section><h3>Media Sosial</h3><div className="footer-social">{instagram && <a href={instagram} target="_blank" rel="noreferrer"><Image src="/images/icons/instagram.svg" width={20} height={20} alt=""/>Instagram</a>}{tiktok && <a href={tiktok} target="_blank" rel="noreferrer"><Image src="/images/icons/tiktok.svg" width={20} height={20} alt=""/>TikTok</a>}</div><p className="footer-note">Harga yang tampil merupakan estimasi dan dapat disesuaikan setelah pemeriksaan.</p></section>
    </div><div className="footer-bottom"><div className="site-container">© 2026 Darul Muttaqien Printing. Seluruh hak dilindungi.</div></div></footer>
  </>;
}
