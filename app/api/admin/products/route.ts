import { jsonResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function GET(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try { const [products, categories] = await db.$transaction([db.product.findMany({ where: { ...(query ? {OR: [{ name: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }]}:{}) }, include: { category: true, options: { where:{isActive:true},include:{values:{where:{isActive:true}}} } }, orderBy: { sortOrder: "asc" }, take: 200 }), db.category.findMany({ orderBy: { sortOrder: "asc" } })]); return jsonResponse({ products, categories }); }
  catch { return jsonResponse({ error: "Data produk belum dapat dimuat." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { categoryId?: string; name?: string; sku?: string; shortDescription?: string; description?: string; basePrice?: number|string; unit?: string; minimumOrder?: number|string; stockOnHand?: number|string; stockMinimum?: number|string; productionEstimate?: string; tone?: string; tag?: string; isActive?: boolean; isFeatured?: boolean; optionSets?: {name:string;isRequired:boolean;values:{name:string;priceAdjustment:number}[]}[] };
  const basePrice=Number(body.basePrice);const minimumOrder=Number(body.minimumOrder??1);const stockOnHand=Number(body.stockOnHand??0);const stockMinimum=Number(body.stockMinimum??0);
  if (!body.categoryId || !body.name?.trim() || !body.sku?.trim() || body.sku.length>100 || !body.unit?.trim() || body.unit.length>50 || !Number.isSafeInteger(basePrice) || basePrice < 0 || !Number.isInteger(minimumOrder)||minimumOrder<1||!Number.isInteger(stockOnHand)||!Number.isInteger(stockMinimum)||stockMinimum<0) return jsonResponse({ error: "Kategori, nama, SKU, satuan, harga, dan jumlah stok wajib valid." }, { status: 422 });
  if(body.optionSets&&(body.optionSets.length>20||body.optionSets.some((set)=>!set.name.trim()||set.values.length>50||set.values.some((value)=>!value.name.trim()||!Number.isSafeInteger(value.priceAdjustment)||value.priceAdjustment<0))))return jsonResponse({error:"Data pilihan produk tidak valid."},{status:422});
  try { const product = await db.$transaction(async(tx)=>{const created=await tx.product.create({ data: { categoryId: BigInt(body.categoryId!), name: body.name!.trim(), slug: slugify(body.name!), sku: body.sku!.trim(), shortDescription: body.shortDescription, description: body.description, basePrice, unit: body.unit!.trim(), minimumOrder, stockOnHand, stockMinimum, productionEstimate: body.productionEstimate, tone: body.tone ?? "blue", tag: body.tag || null, isActive: body.isActive ?? true, isFeatured: body.isFeatured ?? false } });for(const [index,set]of(body.optionSets??[]).entries())await tx.productOption.create({data:{productId:created.id,name:set.name.trim(),isRequired:set.isRequired,sortOrder:index+1,values:{create:set.values.map((value,valueIndex)=>({name:value.name.trim(),priceAdjustment:value.priceAdjustment,sortOrder:valueIndex+1}))}}});return created;}); return jsonResponse({ product }, { status: 201 }); }
  catch { return jsonResponse({ error: "Produk gagal disimpan. Pastikan kategori dan SKU unik." }, { status: 422 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const body = await request.json() as { id?: string; action?: string; [key: string]: unknown };
  if (!body.id) return jsonResponse({ error: "ID produk wajib diisi." }, { status: 422 });
  try {
    if(body.action==="feature"&&Array.isArray(body.optionSets)){
      const productId=BigInt(body.id);const sets=body.optionSets as {name?:string;isRequired?:boolean;values?:{name?:string;priceAdjustment?:number}[]}[];
      if(sets.length>20||sets.some((set)=>!set.name?.trim()||(set.values?.length??0)>50||set.values?.some((value)=>!value.name?.trim()||!Number.isSafeInteger(value.priceAdjustment)||Number(value.priceAdjustment)<0)))return jsonResponse({error:"Data pilihan produk tidak valid."},{status:422});
      await db.$transaction(async(tx)=>{const activeIds:bigint[]=[];for(const [index,set]of sets.entries()){let option=await tx.productOption.findFirst({where:{productId,name:set.name!.trim()}});option=option?await tx.productOption.update({where:{id:option.id},data:{isRequired:Boolean(set.isRequired),isActive:true,sortOrder:index+1}}):await tx.productOption.create({data:{productId,name:set.name!.trim(),isRequired:Boolean(set.isRequired),isActive:true,sortOrder:index+1}});activeIds.push(option.id);for(const [valueIndex,value]of(set.values??[]).entries()){const existing=await tx.productOptionValue.findFirst({where:{productOptionId:option.id,name:value.name!.trim()}});if(existing)await tx.productOptionValue.update({where:{id:existing.id},data:{priceAdjustment:Number(value.priceAdjustment),isActive:true,sortOrder:valueIndex+1}});else await tx.productOptionValue.create({data:{productOptionId:option.id,name:value.name!.trim(),priceAdjustment:Number(value.priceAdjustment),isActive:true,sortOrder:valueIndex+1}});}}await tx.productOption.updateMany({where:{productId,...(activeIds.length?{id:{notIn:activeIds}}:{})},data:{isActive:false}});});
      return jsonResponse({message:"Spesifikasi produk diperbarui."});
    }
    if (body.action === "toggle") { const current = await db.product.findUnique({ where: { id: BigInt(body.id) } }); if (!current) return jsonResponse({ error: "Produk tidak ditemukan." }, { status: 404 }); const product = await db.product.update({ where: { id: current.id }, data: { isActive: !current.isActive } }); return jsonResponse({ product }); }
    if(Array.isArray(body.optionSets)) {
      const sets=body.optionSets as {name?:string;isRequired?:boolean;values?:{name?:string;priceAdjustment?:number}[]}[];
      if(sets.length>20||sets.some((set)=>!set.name?.trim()||(set.values?.length??0)>50||set.values?.some((value)=>!value.name?.trim()||!Number.isSafeInteger(value.priceAdjustment)||Number(value.priceAdjustment)<0)))return jsonResponse({error:"Data pilihan produk tidak valid."},{status:422});
      const productId=BigInt(body.id);
      await db.$transaction(async(tx)=>{const activeIds:bigint[]=[];for(const[index,set]of sets.entries()){let option=await tx.productOption.findFirst({where:{productId,name:set.name!.trim()}});option=option?await tx.productOption.update({where:{id:option.id},data:{isRequired:Boolean(set.isRequired),isActive:true,sortOrder:index+1}}):await tx.productOption.create({data:{productId,name:set.name!.trim(),isRequired:Boolean(set.isRequired),sortOrder:index+1}});activeIds.push(option.id);for(const[valueIndex,value]of(set.values??[]).entries()){const existing=await tx.productOptionValue.findFirst({where:{productOptionId:option.id,name:value.name!.trim()}});if(existing)await tx.productOptionValue.update({where:{id:existing.id},data:{priceAdjustment:Number(value.priceAdjustment),isActive:true,sortOrder:valueIndex+1}});else await tx.productOptionValue.create({data:{productOptionId:option.id,name:value.name!.trim(),priceAdjustment:Number(value.priceAdjustment),sortOrder:valueIndex+1}});}}await tx.productOption.updateMany({where:{productId,...(activeIds.length?{id:{notIn:activeIds}}:{})},data:{isActive:false}});});
    }
    const product = await db.product.update({ where: { id: BigInt(body.id) }, data: { ...(typeof body.name === "string" ? { name: body.name.trim(), slug: slugify(body.name) } : {}), ...(typeof body.sku === "string" ? { sku: body.sku.trim() } : {}), ...(typeof body.categoryId === "string" ? {categoryId:BigInt(body.categoryId)} : {}), ...(typeof body.basePrice === "number" ? { basePrice: body.basePrice } : {}), ...(typeof body.unit === "string" ? {unit:body.unit.trim()} : {}), ...(typeof body.minimumOrder === "number" ? {minimumOrder:body.minimumOrder} : {}), ...(typeof body.stockOnHand === "number" ? { stockOnHand: body.stockOnHand } : {}), ...(typeof body.stockMinimum === "number" ? { stockMinimum: body.stockMinimum } : {}), ...(typeof body.shortDescription === "string" ? {shortDescription:body.shortDescription} : {}), ...(typeof body.description === "string" ? {description:body.description} : {}), ...(typeof body.productionEstimate === "string" ? {productionEstimate:body.productionEstimate} : {}), ...(typeof body.tone === "string" ? {tone:body.tone} : {}), ...(typeof body.tag === "string" ? {tag:body.tag||null} : {}), ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}), ...(typeof body.isFeatured === "boolean" ? { isFeatured: body.isFeatured } : {}) } }); return jsonResponse({ product });
  } catch { return jsonResponse({ error: "Perubahan produk gagal disimpan." }, { status: 422 }); }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id"); if (!id) return jsonResponse({ error: "ID produk wajib diisi." }, { status: 422 });
  try { const product = await db.product.update({ where: { id: BigInt(id) }, data: { isActive: false, archivedAt: new Date() } }); return jsonResponse({ product }); }
  catch { return jsonResponse({ error: "Produk tidak dapat dinonaktifkan." }, { status: 422 }); }
}
