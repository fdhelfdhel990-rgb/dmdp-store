import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/r2";

const cartCookie = "dmt_cart";
const digitsPhone = (phone: string) => { const digits = phone.replace(/\D/g, ""); return digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : `62${digits}`; };

export async function POST(request: Request) {
  const data = await request.formData();
  const name = String(data.get("name") ?? "").trim();
  const phone = String(data.get("phone") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const fulfillment = String(data.get("fulfillment_method") ?? "");
  const address = String(data.get("shipping_address") ?? "").trim();
  const region = String(data.get("shipping_region") ?? "").trim();
  if (name.length < 2 || !phone || !["shipping", "pickup"].includes(fulfillment) || (fulfillment === "shipping" && (!address || !region)) || data.get("approved") !== "on") return NextResponse.json({ error: "Mohon lengkapi nama, nomor WhatsApp, informasi pengiriman, dan persetujuan pesanan." }, { status: 422 });
  if(email&&(!/^\S+@\S+\.\S+$/.test(email)||email.length>255)||name.length>255||phone.length>30||address.length>2000||region.length>255||String(data.get("address_note")??"").length>500||String(data.get("customer_note")??"").length>2000||String(data.get("postal_code")??"").length>20) return NextResponse.json({error:"Panjang atau format data penerima tidak valid."},{status:422});
  const jar = await cookies();
  let cart: { slug: string; quantity: number; options: Record<string, string> }[] = [];
  try { cart = JSON.parse(jar.get(cartCookie)?.value ?? "[]") as typeof cart; } catch { cart = []; }
  if (!cart.length) return NextResponse.json({ error: "Keranjang masih kosong." }, { status: 400 });
  try {
    const dbProducts = await db.product.findMany({ where: { slug: { in: cart.map((item) => item.slug) }, isActive: true, archivedAt: null, category: { isActive: true, archivedAt: null } }, include: { options: { where: { isActive: true }, include: { values: { where: { isActive: true } } } } } });
    if (!dbProducts.length) return NextResponse.json({ error: "Katalog database belum disiapkan. Hubungi admin." }, { status: 503 });
    const catalog = dbProducts;
    const lineItems = cart.map((item) => {
      const product = catalog.find((candidate) => candidate.slug === item.slug);
      if (!product) throw new Error("Produk keranjang tidak ditemukan.");
      const selectedOptions = item.options;
      const chosen = product.options.flatMap((option) => { const value = option.values.find((entry) => entry.id.toString() === selectedOptions[option.id.toString()]); return value ? [{ optionName: option.name, valueName: value.name, priceAdjustment: Number(value.priceAdjustment) }] : []; });
      if (Object.keys(selectedOptions).some((key) => !product.options.some((option) => option.id.toString() === key && option.values.some((value) => value.id.toString() === selectedOptions[key])))) throw new Error(`Opsi untuk ${product.name} sudah tidak tersedia.`);
      for (const option of product.options) if (option.isRequired && !chosen.some((value) => value.optionName === option.name)) throw new Error(`Pilih opsi ${option.name} untuk ${product.name}.`);
      const basePrice = Number(product.basePrice);
      const amount = basePrice + chosen.reduce((total, option) => total + option.priceAdjustment, 0);
      if(!Number.isInteger(item.quantity)||item.quantity<product.minimumOrder||item.quantity>999)throw new Error(`Jumlah untuk ${product.name} tidak memenuhi minimum pemesanan.`);
      return { item, product, chosen, amount, basePrice };
    });
    const subtotal = lineItems.reduce((total, line) => total + line.amount * line.item.quantity, 0);
    if(!Number.isSafeInteger(subtotal))return NextResponse.json({error:"Total pesanan melampaui batas yang dapat diproses."},{status:422});
    const orderNo = `DMT-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const token = randomBytes(32).toString("hex");
    const order = await db.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { name, phone: digitsPhone(phone), email: email || null } });
      const order = await tx.order.create({ data: { orderNumber: orderNo, customerId: customer.id, publicToken: token, status: "pending_review", estimatedSubtotal: subtotal, estimatedTotal: subtotal, fulfillmentMethod: fulfillment, shippingAddress: fulfillment === "shipping" ? address : null, shippingRegion: fulfillment === "shipping" ? region : null, postalCode: String(data.get("postal_code") ?? "") || null, addressNote: String(data.get("address_note") ?? "") || null, customerNote: String(data.get("customer_note") ?? "") || null, items: { create: lineItems.map(({ item, product, chosen, amount, basePrice }) => ({ productId: product.id, productImageDisk: product.imagePath ? "public" : null, productImagePath: product.imagePath, productName: product.name, sku: product.sku, unit: product.unit, quantity: item.quantity, basePrice, optionsTotal: amount - basePrice, unitEstimate: amount, subtotal: amount * item.quantity, options: { create: chosen.map((option) => ({ optionName: option.optionName, optionValue: option.valueName, priceAdjustment: option.priceAdjustment })) } })) }, statusHistories: { create: { status: "pending_review", note: "Pesanan dibuat oleh pelanggan." } } } });
      for (const line of lineItems) {
        const file = data.get(`design_${line.item.slug}`);
        if (file instanceof File && file.size > 0) {
          if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "application/pdf", "application/zip"].includes(file.type)) throw new Error("File desain harus JPG, PNG, PDF, atau ZIP dengan ukuran maksimal 10 MB.");
          const path = await uploadFile(`order-designs/${token}/${line.item.slug}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, file);
          const orderItem = await tx.orderItem.findFirst({ where: { orderId: order.id, product: { slug: line.item.slug } }, select: { id: true }, orderBy: { id: "desc" } });
          if (orderItem) await tx.orderFile.create({ data: { orderItemId: orderItem.id, disk: "r2", path, originalName: file.name, mimeType: file.type, size: BigInt(file.size) } });
        }
      }
      return order;
    });
    const response = NextResponse.json({ orderNumber: order.orderNumber, publicToken: token, message: "Pesanan berhasil dibuat." }, { status: 201 });
    response.cookies.set("dmt_verified_order", order.orderNumber, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 2 });
    response.cookies.set(cartCookie, "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pesanan belum berhasil dibuat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
