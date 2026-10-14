import { jsonResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { readFile } from "@/lib/r2";

export async function GET(request:Request,{params}:RouteContext<"/api/admin/files/[id]">){
  const auth=await requireAdmin();if(auth.error)return auth.error;
  const {id}=await params;
  try{const file=await db.orderFile.findUnique({where:{id:BigInt(id)},include:{orderItem:{include:{order:true}}}});if(!file)return jsonResponse({error:"File tidak ditemukan."},{status:404});const result=await readFile(file.path);const bytes=await result.Body?.transformToByteArray();if(!bytes)return jsonResponse({error:"File kosong atau tidak tersedia."},{status:404});const body=new Blob([new Uint8Array(bytes).buffer as ArrayBuffer],{type:file.mimeType});const disposition=new URL(request.url).searchParams.get("download")==="1"?"attachment":"inline";return new NextResponse(body,{headers:{"Content-Type":file.mimeType,"Content-Length":String(bytes.byteLength),"Content-Disposition":`${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}catch{return jsonResponse({error:"File belum tersedia di penyimpanan."},{status:503});}
}
