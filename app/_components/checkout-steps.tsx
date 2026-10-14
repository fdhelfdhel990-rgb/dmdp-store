const labels = ["Keranjang", "Penerima", "Pengiriman", "Pembayaran", "Selesai"];
export default function CheckoutSteps({ activeStep }: { activeStep:number }) {
  return <div className="checkout-steps site-container">{labels.map((label,index)=><div className={`checkout-step ${index<=activeStep?"active":""}`} key={label}><span>{index+1}</span><small>{label}</small></div>)}</div>;
}
