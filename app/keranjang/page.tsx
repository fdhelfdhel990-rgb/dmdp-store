import Link from "next/link";
import CustomerShell from "../_components/customer-shell";
import CheckoutSteps from "../_components/checkout-steps";
import CartContents from "./cart-contents";

export const instant = false;

export default function CartPage(){return <CustomerShell><section className="page-section compact-top"><CheckoutSteps activeStep={0}/><div className="site-container"><h1 className="page-title">Daftar Belanja</h1><p className="muted">Tinjau kembali spesifikasi dan jumlah produk yang Anda perlukan.</p><CartContents/><div className="cart-actions"><Link href="/katalog" className="button button-secondary">Lanjutkan belanja</Link><Link href="/checkout" className="button button-primary">Lanjutkan</Link></div></div></section></CustomerShell>;}
