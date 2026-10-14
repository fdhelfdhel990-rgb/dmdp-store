import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!databaseUrl) throw new Error("DATABASE_URL atau DIRECT_URL belum diatur. Isi variabel database di file .env.");
const adapter = new PrismaPg({ connectionString: databaseUrl });
const db = new PrismaClient({ adapter });

const categories = [
  ["Merchandise & Souvenir", "merchandise-souvenir"], ["Print Warna", "print-warna"], ["Stiker", "stiker"], ["Packaging UMKM", "packaging-umkm"], ["Poster", "poster"], ["Kalender", "kalender"], ["Banner", "banner"], ["Kartu Nama", "kartu-nama"], ["Stempel", "stempel"],
] as const;
const products = [
  { name: "Cetak Stiker Vinyl", slug: "cetak-stiker-vinyl", sku: "DMT-STK-01", category: "stiker", basePrice: 35000, unit: "lembar", tone: "cyan", tag: "Terlaris" },
  { name: "Kartu Nama Premium", slug: "kartu-nama-premium", sku: "DMT-KNM-01", category: "kartu-nama", basePrice: 65000, unit: "box", tone: "navy", tag: "Favorit" },
  { name: "X-Banner Indoor", slug: "x-banner-indoor", sku: "DMT-BNR-01", category: "banner", basePrice: 115000, unit: "set", tone: "yellow", tag: null },
  { name: "Brosur A5 Full Color", slug: "brosur-a5-full-color", sku: "DMT-PRW-01", category: "print-warna", basePrice: 45000, unit: "100 lembar", tone: "magenta", tag: "Cepat" },
  { name: "Stempel Flash K3", slug: "stempel-flash-k3", sku: "DMT-STP-03", category: "stempel", basePrice: 95000, unit: "pcs", tone: "red", tag: null },
  { name: "Paper Bag Custom", slug: "paper-bag-custom", sku: "DMT-PKG-01", category: "packaging-umkm", basePrice: 8500, unit: "pcs", tone: "green", tag: null },
  { name: "Tumbler Custom", slug: "tumbler-custom", sku: "DMT-MER-01", category: "merchandise-souvenir", basePrice: 75000, unit: "pcs", tone: "blue", tag: "Baru" },
  { name: "Poster A3+", slug: "poster-a3-plus", sku: "DMT-PST-01", category: "poster", basePrice: 12000, unit: "lembar", tone: "orange", tag: null },
];

async function main() {
  for (const [sortOrder, [name, slug]] of categories.entries()) await db.category.upsert({ where: { slug }, update: { name, isActive: true, archivedAt: null, sortOrder: sortOrder + 1 }, create: { name, slug, isActive: true, sortOrder: sortOrder + 1 } });
  for (const [index, product] of products.entries()) {
    const category = await db.category.findUniqueOrThrow({ where: { slug: product.category } });
    const saved = await db.product.upsert({ where: { slug: product.slug }, update: { name: product.name, sku: product.sku, categoryId: category.id, basePrice: product.basePrice, unit: product.unit, tone: product.tone, tag: product.tag, isActive: true, isFeatured: index < 4, sortOrder: index + 1, shortDescription: "Produk cetak berkualitas untuk kebutuhan usaha dan personal.", description: "Pilihan produk DMT Print dengan hasil rapi dan estimasi pengerjaan yang jelas." }, create: { name:product.name,slug:product.slug,sku:product.sku,categoryId:category.id,basePrice:product.basePrice,unit:product.unit,tone:product.tone,tag:product.tag,isActive:true,isFeatured:index<4,sortOrder:index+1,shortDescription:"Produk cetak berkualitas untuk kebutuhan usaha dan personal.",description:"Pilihan produk DMT Print dengan hasil rapi dan estimasi pengerjaan yang jelas." } });
    const optionsByProduct: Record<string, { name:string; required:boolean; values:readonly (readonly [string,number])[] }[]> = {
      "cetak-stiker-vinyl": [{name:"Bahan stiker",required:true,values:[["Vinyl putih",0],["Transparan",8000]]},{name:"Cutting",required:false,values:[["Tanpa cutting",0],["Kiss cut",10000]]}],
      "kartu-nama-premium": [{name:"Jenis kertas",required:true,values:[["Art carton 260 gsm",0],["Linen premium",15000]]},{name:"Sisi cetak",required:true,values:[["Satu sisi",0],["Dua sisi",20000]]},{name:"Finishing",required:false,values:[["Tanpa finishing",0],["Laminasi doff",10000]]}],
      "x-banner-indoor": [{name:"Ukuran",required:true,values:[["60 x 160 cm",0],["80 x 180 cm",30000]]},{name:"Bahan",required:true,values:[["Flexi china",0],["Flexi korea",25000]]}],
      "brosur-a5-full-color": [{name:"Jenis kertas",required:true,values:[["HVS 100 gsm",0],["Art paper 120 gsm",12000]]},{name:"Sisi cetak",required:true,values:[["Satu sisi",0],["Dua sisi",15000]]}],
      "stempel-flash-k3": [{name:"Warna",required:true,values:[["Hitam",0],["Biru",0],["Merah",0]]},{name:"Ukuran",required:true,values:[["30 x 30 mm",0],["40 x 40 mm",20000]]}],
      "paper-bag-custom": [{name:"Bahan",required:true,values:[["Kraft coklat",0],["Ivory putih",2500]]},{name:"Ukuran",required:true,values:[["Small",0],["Medium",3000]]}],
      "tumbler-custom": [{name:"Warna tumbler",required:true,values:[["Putih",0],["Hitam",0]]}],
      "poster-a3-plus": [{name:"Ukuran",required:true,values:[["A3+",0],["A2",18000]]},{name:"Bahan",required:true,values:[["Art paper",0],["Matte paper",5000]]},{name:"Finishing",required:false,values:[["Tanpa finishing",0],["Laminasi",7000]]}],
    };
    const optionSets = optionsByProduct[product.slug] ?? [];
    for (const [sortOrder, optionData] of optionSets.entries()) { const existingOption=await db.productOption.findFirst({where:{productId:saved.id,name:optionData.name}}); const option=existingOption?await db.productOption.update({where:{id:existingOption.id},data:{isRequired:optionData.required,isActive:true,sortOrder:sortOrder+1}}):await db.productOption.create({data:{productId:saved.id,name:optionData.name,isRequired:optionData.required,sortOrder:sortOrder+1}}); for (const [valueOrder,[name,priceAdjustment]] of optionData.values.entries()) { const existing=await db.productOptionValue.findFirst({where:{productOptionId:option.id,name}}); if(existing) await db.productOptionValue.update({where:{id:existing.id},data:{priceAdjustment,isActive:true,sortOrder:valueOrder+1}}); else await db.productOptionValue.create({data:{productOptionId:option.id,name,priceAdjustment,isActive:true,sortOrder:valueOrder+1}}); } }
  }
  for (const [sortOrder, [type,name]] of [["qris","QRIS"],["bank_transfer","Transfer Bank"],["cash","Tunai / COD"]].entries()) { const existing=await db.paymentMethod.findFirst({where:{type}}); if(existing) await db.paymentMethod.update({where:{id:existing.id},data:{name,sortOrder:sortOrder+1}}); else await db.paymentMethod.create({data:{type,name,isActive:type!=="cash",sortOrder:sortOrder+1}}); }
  const email=process.env.DMT_ADMIN_EMAIL; const password=process.env.DMT_ADMIN_PASSWORD;
  if(email && password) await db.user.upsert({where:{email},update:{name:process.env.DMT_ADMIN_NAME??"Owner Admin",password:await hash(password,12),isAdmin:true,isActive:true},create:{name:process.env.DMT_ADMIN_NAME??"Owner Admin",email,password:await hash(password,12),isAdmin:true,isActive:true,role:"owner"}});
}

main().finally(async()=>db.$disconnect());
