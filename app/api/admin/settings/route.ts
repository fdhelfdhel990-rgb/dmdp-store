import { jsonResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { uploadFile } from "@/lib/r2";

export async function GET() {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  try { const [settings, paymentMethods, banners, products, admins] = await db.$transaction([db.siteSetting.findMany(), db.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } }), db.banner.findMany({ orderBy: { sortOrder: "asc" } }), db.product.findMany({ where: { isActive: true }, select: { id: true, name: true, isFeatured: true }, orderBy: { name: "asc" } }), db.user.findMany({ where: { isAdmin: true }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true }, orderBy: { name: "asc" } })]); return jsonResponse({ settings: Object.fromEntries(settings.map((entry) => [entry.key, entry.value])), paymentMethods, banners, products, admins }); }
  catch { return jsonResponse({ error: "Pengaturan belum dapat dimuat." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    if (String(form.get("kind") ?? "") !== "banner" || !String(form.get("id") ?? "")) return jsonResponse({ error: "Banner tidak valid." }, { status: 422 });
    const id = String(form.get("id"));
    const title = String(form.get("title") ?? "").trim();
    const sortOrder = Number(form.get("sort_order"));
    const file = form.get("image");
    if (!title || title.length > 255 || !Number.isInteger(sortOrder) || sortOrder < 0) return jsonResponse({ error: "Judul dan urutan banner tidak valid." }, { status: 422 });
    if (file instanceof File && file.size > 0 && (file.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) return jsonResponse({ error: "Gambar banner harus JPG, PNG, atau WebP maksimal 4 MB." }, { status: 422 });
    try {
      const current = await db.banner.findUnique({ where: { id: BigInt(id) } });
      if (!current) return jsonResponse({ error: "Banner tidak ditemukan." }, { status: 404 });
      const imagePath = file instanceof File && file.size > 0 ? await uploadFile(`banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, file, "public") : current.imagePath;
      const banner = await db.banner.update({ where: { id: current.id }, data: { title, description: String(form.get("description") ?? "") || null, buttonLabel: String(form.get("button_label") ?? "") || null, buttonUrl: String(form.get("button_url") ?? "") || null, sortOrder, isActive: form.get("is_active") === "on", imagePath } });
      return jsonResponse({ banner, message: "Banner diperbarui." });
    } catch { return jsonResponse({ error: "Banner gagal diperbarui." }, { status: 422 }); }
  }
  const body = await request.json() as { section?: string; value?: unknown; paymentMethods?:{type:string;name:string;bankName?:string;accountNumber?:string;accountName?:string;instructions?:string;isActive:boolean;sortOrder:number}[]; featuredIds?:string[] };
  if (!body.section || (!body.value && !body.paymentMethods && !body.featuredIds)) return jsonResponse({ error: "Bagian dan nilai pengaturan wajib diisi." }, { status: 422 });
  if(body.section==="payment"&&body.paymentMethods){if(body.paymentMethods.some((method)=>!['qris','bank_transfer','cash'].includes(method.type)||!method.name.trim()))return jsonResponse({error:"Metode pembayaran tidak valid."},{status:422});try{for(const method of body.paymentMethods){const id=(method as unknown as {id?:string}).id;const existing=id?await db.paymentMethod.findUnique({where:{id:BigInt(id)}}):await db.paymentMethod.findFirst({where:{type:method.type}});if(existing)await db.paymentMethod.update({where:{id:existing.id},data:{name:method.name,bankName:method.bankName??null,accountNumber:method.accountNumber??null,accountName:method.accountName??null,instructions:method.instructions??null,isActive:method.isActive,sortOrder:method.sortOrder}});else await db.paymentMethod.create({data:{...method}});}return jsonResponse({message:"Metode pembayaran diperbarui."});}catch{return jsonResponse({error:"Metode pembayaran gagal diperbarui."},{status:422});}}
  if(body.section==="featured"&&body.featuredIds){try{await db.$transaction([db.product.updateMany({data:{isFeatured:false}}),db.product.updateMany({where:{id:{in:body.featuredIds.map(BigInt)}},data:{isFeatured:true}})]);return jsonResponse({message:"Produk unggulan diperbarui."});}catch{return jsonResponse({error:"Produk unggulan gagal diperbarui."},{status:422});}}
  try { const setting = await db.siteSetting.upsert({ where: { key: body.section }, update: { value: body.value as object }, create: { key: body.section, value: body.value as object } }); return jsonResponse({ setting }); }
  catch { return jsonResponse({ error: "Pengaturan gagal disimpan." }, { status: 422 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  try {
    if (kind === "payment") {
      const type = String(form.get("type") ?? "");
      if (!["qris", "bank_transfer", "cash"].includes(type) || !String(form.get("name") ?? "").trim()) return jsonResponse({ error: "Metode dan nama pembayaran wajib diisi." }, { status: 422 });
      const id = String(form.get("id") ?? "");
      const values = { name: String(form.get("name")), bankName: String(form.get("bank_name") ?? "") || null, accountNumber: String(form.get("account_number") ?? "") || null, accountName: String(form.get("account_name") ?? "") || null, instructions: String(form.get("instructions") ?? "") || null, isActive: form.get("is_active") === "on", sortOrder: Number(form.get("sort_order") ?? 0) };
      const existing = id ? await db.paymentMethod.findUnique({ where: { id: BigInt(id) } }) : await db.paymentMethod.findFirst({ where: { type } });
      const paymentMethod = existing ? await db.paymentMethod.update({ where: { id: existing.id }, data: { ...values, type } }) : await db.paymentMethod.create({ data: { ...values, type } });
      return jsonResponse({ paymentMethod });
    }
    if (kind === "banner") {
      const file = form.get("image");
      if (!(file instanceof File) || file.size < 1 || file.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return jsonResponse({ error: "Banner wajib berupa JPG, PNG, atau WebP maksimal 4 MB." }, { status: 422 });
      const path = await uploadFile(`banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, file, "public");
      const banner = await db.banner.create({ data: { title: String(form.get("title") ?? "Banner DMT Print"), description: String(form.get("description") ?? "") || null, buttonLabel: String(form.get("button_label") ?? "") || null, buttonUrl: String(form.get("button_url") ?? "") || null, imagePath: path, sortOrder: Number(form.get("sort_order") ?? 0), isActive: form.get("is_active") === "on" } });
      return jsonResponse({ banner }, { status: 201 });
    }
    return jsonResponse({ error: "Jenis pengaturan tidak dikenali." }, { status: 422 });
  } catch { return jsonResponse({ error: "Pengaturan gagal disimpan. Pastikan ID dan type metode unik." }, { status: 422 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const id = params.get("id"); const kind = params.get("kind");
  if (!id || !["banner", "payment"].includes(kind ?? "")) return jsonResponse({ error: "Jenis dan ID wajib diisi." }, { status: 422 });
  try {
    if (kind === "banner") { const banner = await db.banner.findUnique({ where: { id: BigInt(id) } }); if (!banner) return jsonResponse({ error: "Banner tidak ditemukan." }, { status: 404 }); const updated = await db.banner.update({ where: { id: banner.id }, data: { archivedAt: new Date(), isActive: false } }); return jsonResponse({ banner: updated }); }
    const paymentMethod = await db.paymentMethod.update({ where: { id: BigInt(id) }, data: { isActive: false } }); return jsonResponse({ paymentMethod });
  } catch { return jsonResponse({ error: "Data tidak dapat diarsipkan." }, { status: 422 }); }
}
