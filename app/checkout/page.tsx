import Link from "next/link";
import CheckoutForm from "./checkout-form";

export const instant = false;

export default function CheckoutPage() {
  return <><main className="page-main simple-page"><p className="eyebrow"><span/> PESANAN · DETAIL PENERIMA</p><h1 className="page-title">Ceritakan<br/>detail <em>pesananmu.</em></h1><p className="page-subtitle">Admin akan menghubungi nomor WhatsApp ini untuk konfirmasi dan penawaran harga final.</p><div className="notice">Harga final ditentukan admin setelah memeriksa spesifikasi dan file desain pesananmu.</div><CheckoutForm/><p className="page-subtitle" style={{marginTop:20}}><Link href="/keranjang">← Kembali ke keranjang</Link></p></main><footer className="site-footer"><Link href="/"><b>DMT PRINT</b></Link><p>Ide hebat layak dicetak sempurna.</p><div><Link href="/katalog">Katalog</Link><Link href="/cek-pesanan">Lacak pesanan</Link></div><small>© 2026 DMT PRINT STUDIO</small></footer></>;
}
