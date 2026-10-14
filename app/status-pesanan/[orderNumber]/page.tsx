import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { rupiah } from "@/lib/catalog";
import OrderActions from "./order-actions";

export const instant = false;

export default async function OrderStatusPage({ params }: PageProps<"/status-pesanan/[orderNumber]">) {
  const { orderNumber } = await params;
  const jar = await cookies();
  if (jar.get("dmt_verified_order")?.value !== orderNumber) notFound();
  try {
    const order = await db.order.findUnique({ where: { orderNumber }, include: { customer: true, items: { include: { options: true, files: true } }, payments: true, statusHistories: { orderBy: { createdAt: "desc" } } } });
    if (!order) notFound();
    const remaining = Math.max(0, Number(order.finalTotal ?? 0) - Number(order.amountPaid));
    const paymentMethods = await db.paymentMethod.findMany({ where:{isActive:true},orderBy:{sortOrder:"asc"},select:{type:true,name:true,instructions:true} });
    return <><main className="page-main simple-page"><p className="eyebrow"><span/> STATUS PESANAN · {order.orderNumber}</p><h1 className="page-title">Halo, {order.customer.name.split(" ")[0]}.</h1><p className="page-subtitle">Berikut perkembangan pesananmu. Admin akan menghubungimu jika ada pembaruan.</p><div className="simple-card"><span className="status-badge">{order.status.replaceAll("_", " ").toUpperCase()}</span><h2 style={{fontSize:19}}>Ringkasan pesanan</h2><p className="page-subtitle">Dibuat {new Intl.DateTimeFormat("id-ID", {dateStyle:"long",timeStyle:"short"}).format(order.createdAt)}</p><table className="order-table"><thead><tr><th>Produk</th><th>Jumlah</th><th>Estimasi</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id.toString()}><td><b>{item.productName}</b><br/><span style={{color:"#858980"}}>{item.options.map((option) => `${option.optionName}: ${option.optionValue}`).join(" · ")}</span></td><td>{item.quantity} {item.unit}</td><td>{rupiah(Number(item.finalSubtotal ?? item.subtotal))}</td></tr>)}</tbody></table><div className="order-total">{order.finalTotal === null ? "Estimasi" : "Total final"}: {rupiah(Number(order.finalTotal ?? order.estimatedTotal))}</div><h2 style={{fontSize:15,marginTop:23}}>Riwayat</h2>{order.statusHistories.map((history) => <p key={history.id.toString()} className="page-subtitle">{history.status.replaceAll("_", " ")} · {history.note ?? "Status diperbarui"}</p>)}{order.payments.map((payment)=><p className="page-subtitle" key={payment.id.toString()}>Pembayaran {payment.method} · {payment.status} · {rupiah(Number(payment.amount))}</p>)}</div><OrderActions orderNumber={order.orderNumber} status={order.status} remaining={remaining} paymentMethods={paymentMethods}/><p className="page-subtitle" style={{marginTop:20}}><Link href="/cek-pesanan">Lacak pesanan lain</Link></p></main><footer className="site-footer"><Link href="/"><b>DMT PRINT</b></Link><p>Ide hebat layak dicetak sempurna.</p><div><Link href="/katalog">Katalog</Link><a href="https://wa.me/">Hubungi admin</a></div><small>© 2026 DMT PRINT STUDIO</small></footer></>;
  } catch {
    return <main className="simple-page"><h1>Status pesanan belum tersedia.</h1><p>Basis data belum dikonfigurasi.</p><Link href="/cek-pesanan">Kembali</Link></main>;
  }
}
