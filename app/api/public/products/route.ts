import { jsonResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/catalog";
import { publicImageUrl } from "@/lib/r2";

export async function GET() {
  try {
    const [rows, categoryRows, bannerRows, settings] = await Promise.all([db.product.findMany({ where: { isActive: true, archivedAt: null, category: { isActive: true, archivedAt: null } }, include: { category: true }, orderBy: { sortOrder: "asc" } }), db.category.findMany({where:{isActive:true,archivedAt:null},orderBy:{sortOrder:"asc"}}), db.banner.findMany({where:{isActive:true,archivedAt:null},orderBy:{sortOrder:"asc"}}), db.siteSetting.findMany()]);
    const banners = bannerRows.map((row)=>{let imageUrl:string|null=null;try{if(row.imagePath)imageUrl=publicImageUrl(row.imagePath);}catch{/* storage not configured */}return{title:row.title,description:row.description,buttonLabel:row.buttonLabel,buttonUrl:row.buttonUrl,imageUrl};});
    return jsonResponse({ categories: categoryRows.map((row)=>({name:row.name,slug:row.slug,icon:"✦"})), products: rows.map((row) => ({ name:row.name,slug:row.slug,category:row.category.name,price:Number(row.basePrice),unit:row.unit,tone:row.tone,tag:row.tag??"",sku:row.sku })), banners, settings:Object.fromEntries(settings.map((row)=>[row.key,row.value])) });
  } catch {
    return jsonResponse({ categories, products, source: "catalog-seed" });
  }
}
