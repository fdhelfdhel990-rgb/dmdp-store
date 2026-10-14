import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { rupiah } from "@/lib/catalog";

export const instant = false;

const nav = [["Ringkasan", "/admin/dashboard"], ["Pesanan", "/admin/pesanan"], ["Produk", "/admin/produk"], ["Kategori", "/admin/kategori"], ["Stok", "/admin/stok"], ["Buku kas", "/admin/buku-kas"], ["Tampilan web", "/admin/tampilan-web"], ["Pengaturan", "/admin/pengaturan"]];

export default async function AdminDashboard() {
  await connection();
  const userId = await currentAdmin();
  if (!userId) redirect("/admin");
  try {
    const user = await db.user.findUnique({ where: { id: BigInt(userId) }, select: { name: true, email: true, isAdmin: true, isActive: true } });
    if (!user?.isAdmin || !user.isActive) redirect("/admin");
    const [newOrdersCount, pendingPaymentsCount, productionCount, products, recentOrders, allProducts, categories, cashbookEntries, settings, banners, admins] = await db.$transaction([
      db.order.count({ where: { status: "pending_review", archivedAt: null } }), db.payment.count({ where: { status: "pending" } }), db.order.count({ where: { status: "production", archivedAt: null } }), db.product.findMany({ where: { isActive: true, archivedAt:null }, select: { stockOnHand: true, stockMinimum: true } }), db.order.findMany({ where: { archivedAt: null }, include: { customer: true, items: true }, orderBy: { createdAt: "desc" }, take: 8 }), db.product.count(), db.category.count(), db.cashbookEntry.count({ where: { archivedAt: null } }), db.siteSetting.count(), db.banner.count(), db.user.count({ where: { isAdmin: true, isActive: true } }),
    ]);
    const lowStockCount = products.filter((product) => product.stockOnHand <= product.stockMinimum).length;
    return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/"><Image src="/images/branding/dmt-print-logo.svg" width={112} height={37} alt="DMT Print"/></Link><span className="admin-label">MENU UTAMA</span>{nav.map(([label, href]) => <Link className={href === "/admin/dashboard" ? "selected" : ""} href={href} key={href}>{label}</Link>)}<span className="admin-label" style={{marginTop:"auto"}}>AKUN</span><span style={{padding:"8px 11px",fontSize:10,color:"#c6cec2"}}>{user.name}</span><form action="/api/admin/session" method="post"><button className="admin-button" style={{background:"transparent",color:"#d6dad4"}}>Keluar ↗</button></form></aside><main className="admin-content"><div className="admin-topbar"><span>Ringkasan hari ini</span><span className="admin-user">{user.name} · {user.email}</span></div><h1 className="admin-title">Fokus pada yang perlu ditangani.</h1><p className="admin-description">Ikhtisar operasional DMT Print.</p><section className="stat-grid"><article className="stat-card"><span>Pesanan baru</span><b>{newOrdersCount}</b><Link href="/admin/pesanan">Periksa pesanan →</Link></article><article className="stat-card"><span>Pembayaran diperiksa</span><b>{pendingPaymentsCount}</b><Link href="/admin/pesanan">Verifikasi →</Link></article><article className="stat-card"><span>Dalam produksi</span><b>{productionCount}</b><Link href="/admin/pesanan">Pantau produksi →</Link></article><article className="stat-card"><span>Stok menipis</span><b>{lowStockCount}</b><Link href="/admin/stok">Periksa stok →</Link></article></section><section className="admin-panel"><h2>Perlu ditangani</h2><div className="task-list"><p>{pendingPaymentsCount} bukti pembayaran perlu diperiksa</p><p>{newOrdersCount} pesanan menunggu konfirmasi harga</p><p>{lowStockCount} produk mencapai stok minimum</p></div></section><section className="admin-panel"><h2>Ringkasan pengelolaan</h2><div className="stat-grid"><article><span>Produk</span><b>{allProducts}</b></article><article><span>Kategori</span><b>{categories}</b></article><article><span>Catatan kas</span><b>{cashbookEntries}</b></article><article><span>Pengaturan situs</span><b>{settings + banners}</b></article><article><span>Admin aktif</span><b>{admins}</b></article></div></section><section className="admin-panel"><h2>Pesanan terbaru</h2>{recentOrders.length ? <table className="admin-table"><thead><tr><th>Kode</th><th>Pelanggan</th><th>Produk</th><th>Estimasi/Total</th><th>Status</th></tr></thead><tbody>{recentOrders.map((order) => <tr key={order.id.toString()}><td>{order.orderNumber}</td><td>{order.customer.name}</td><td>{order.items.map((item) => item.productName).join(", ")}</td><td>{rupiah(Number(order.finalTotal ?? order.estimatedTotal))}</td><td><span className="status-badge">{order.status.replaceAll("_", " ")}</span></td></tr>)}</tbody></table> : <p className="page-subtitle">Belum ada pesanan. Koneksi database perlu dikonfigurasi.</p>}</section></main></div>;
  } catch {
    return <main className="simple-page"><h1>Dashboard Admin</h1><div className="notice">Tidak dapat memuat data. Pastikan DATABASE_URL Supabase, tabel aplikasi, dan SESSION_SECRET telah dikonfigurasi.</div><Link href="/admin">Kembali ke login</Link></main>;
  }
}
