import Link from "next/link";
import CustomerShell from "../_components/customer-shell";
import CheckoutSteps from "../_components/checkout-steps";
import CheckoutForm from "./checkout-form";

export const instant=false;

export default function CheckoutPage(){return <CustomerShell><section className="page-section compact-top"><CheckoutSteps activeStep={1}/><div className="site-container"><h1 className="page-title">Detail penerima pesanan</h1><p className="muted">Lengkapi informasi penerima dan file desain. Admin akan memeriksa spesifikasi sebelum menetapkan harga final.</p><CheckoutForm/><p className="form-note"><Link href="/keranjang">Kembali ke keranjang</Link></p></div></section></CustomerShell>;}
