import Link from "next/link";
import CustomerShell from "../_components/customer-shell";

export const instant = false;

export default function TrackPage(){return <CustomerShell><section className="page-section"><div className="site-container"><div className="track-card panel"><p className="eyebrow blue">Cek pesanan</p><h1>Pesanan Anda sampai di tahap mana?</h1><p>Masukkan kode pesanan dan nomor WhatsApp yang digunakan saat memesan.</p><form action="/api/track" method="post"><div className="form-group"><label htmlFor="order_number">Kode pesanan</label><input id="order_number" name="order_number" placeholder="Contoh: DMT-260914-A1B2C3" required/></div><div className="form-group"><label htmlFor="phone">Nomor WhatsApp</label><input id="phone" name="phone" type="tel" placeholder="08xxxxxxxxxx" required/></div><button className="button button-primary button-block">Cari pesanan</button></form><small>Status hanya dapat dilihat menggunakan kode pesanan dan nomor WhatsApp yang terdaftar.</small><Link href="/katalog" className="text-button">Kembali ke katalog</Link></div></div></section></CustomerShell>;}
