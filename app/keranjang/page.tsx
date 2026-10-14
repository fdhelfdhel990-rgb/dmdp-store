import Link from "next/link";
import CartContents from "./cart-contents";

export const instant = false;

export default function CartPage() {
  return <><main className="page-main simple-page"><p className="eyebrow"><span/> DMT PRINT · KERANJANG</p><h1 className="page-title">Daftar Belanja</h1><p className="page-subtitle">Tinjau kembali spesifikasi dan jumlah produk yang kamu perlukan.</p><CartContents/><p className="page-subtitle" style={{marginTop:20}}><Link href="/katalog">← Lanjutkan belanja</Link></p></main><footer className="site-footer"><Link href="/"><b>DMT PRINT</b></Link><p>Ide hebat layak dicetak sempurna.</p><div><Link href="/katalog">Katalog</Link><Link href="/cek-pesanan">Lacak pesanan</Link></div><small>© 2026 DMT PRINT STUDIO</small></footer></>;
}
