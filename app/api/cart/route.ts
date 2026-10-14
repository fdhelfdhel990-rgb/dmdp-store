import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const cookieName = "dmt_cart";
type CartItem = { slug: string; quantity: number; options: Record<string, string> };

export async function GET() {
  const jar = await cookies();
  let items: CartItem[] = [];
  try { items = JSON.parse(jar.get(cookieName)?.value ?? "[]") as CartItem[]; } catch { /* discard malformed cart cookie */ }
  try {
    const products = await db.product.findMany({ where: { slug: { in: items.map((item) => item.slug) }, isActive: true, archivedAt: null }, include: { category: true, options: { where: { isActive: true }, include: { values: { where: { isActive: true } } } } } });
    return NextResponse.json({ items: items.flatMap((item) => { const product = products.find((entry) => entry.slug === item.slug); if (!product) return []; const selected = product.options.flatMap((option) => { const value = option.values.find((entry) => entry.id.toString() === item.options[option.id.toString()]); return value ? [{ name: option.name, value: value.name, priceAdjustment: Number(value.priceAdjustment) }] : []; }); return [{ ...item, product: { name: product.name, slug: product.slug, category: product.category.name, unit: product.unit, price: Number(product.basePrice) + selected.reduce((sum, entry) => sum + entry.priceAdjustment, 0), minimumOrder: product.minimumOrder }, selected }]; }) });
  } catch { return NextResponse.json({ items }); }
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<CartItem>;
  if (!body.slug || !Number.isInteger(body.quantity) || (body.quantity ?? 0) < 1 || (body.quantity ?? 0) > 999) return NextResponse.json({ error: "Produk atau jumlah tidak valid." }, { status: 422 });
  let product;
  try { product = await db.product.findFirst({ where: { slug: body.slug, isActive: true, archivedAt: null, category: { isActive: true, archivedAt: null } }, include: { options: { where: { isActive: true }, include: { values: { where: { isActive: true } } } } } }); } catch { return NextResponse.json({ error: "Katalog database belum disiapkan." }, { status: 503 }); }
  if (!product) return NextResponse.json({ error: "Produk sedang tidak tersedia." }, { status: 404 });
  if ((body.quantity ?? 0) < product.minimumOrder) return NextResponse.json({ error: `Minimum pemesanan ${product.minimumOrder}.` }, { status: 422 });
  const options = body.options ?? {};
  if (Object.entries(options).some(([id, value]) => !product.options.some((option) => option.id.toString() === id && option.values.some((entry) => entry.id.toString() === value)))) return NextResponse.json({ error: "Spesifikasi produk tidak valid." }, { status: 422 });
  if (product.options.some((option) => option.isRequired && !options[option.id.toString()])) return NextResponse.json({ error: "Pilih semua spesifikasi yang wajib diisi." }, { status: 422 });
  const jar = await cookies();
  let items: CartItem[] = [];
  try { items = JSON.parse(jar.get(cookieName)?.value ?? "[]") as CartItem[]; } catch { items = []; }
  const quantity = body.quantity!;
  const index = items.findIndex((item) => item.slug === body.slug && JSON.stringify(Object.entries(item.options).sort()) === JSON.stringify(Object.entries(options).sort()));
  if (index >= 0) items[index].quantity = Math.min(items[index].quantity + quantity, 999);
  else items.push({ slug: body.slug, quantity, options });
  const response = NextResponse.json({ items, message: "Produk berhasil ditambahkan ke keranjang." });
  response.cookies.set(cookieName, JSON.stringify(items), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return response;
}

export async function PATCH(request: Request) {
  const { slug, quantity } = await request.json() as { slug: string; quantity: number };
  if (!slug || !Number.isInteger(quantity) || quantity < 0 || quantity > 999) return NextResponse.json({ error: "Jumlah tidak valid." }, { status: 422 });
  const jar = await cookies();
  let items: CartItem[] = [];
  try { items = JSON.parse(jar.get(cookieName)?.value ?? "[]") as CartItem[]; } catch { items = []; }
  const selected = items.find((item) => item.slug === slug);
  if(quantity>0&&selected){let minimum=1;try{minimum=(await db.product.findFirstOrThrow({where:{slug,isActive:true}})).minimumOrder;}catch{return NextResponse.json({error:"Produk tidak ditemukan."},{status:404});}if(quantity<minimum)return NextResponse.json({error:`Minimum pemesanan ${minimum}.`},{status:422});}
  items = quantity === 0 ? items.filter((item) => item.slug !== slug) : items.map((item) => item.slug === slug ? { ...item, quantity } : item);
  const response = NextResponse.json({ items });
  response.cookies.set(cookieName, JSON.stringify(items), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ items: [] });
  response.cookies.set(cookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
