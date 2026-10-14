import { jsonResponse } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { readFile } from "@/lib/r2";

export async function GET(request:Request,{params}:RouteContext<"/api/admin/payments/[id]/proof">){
  const auth=await requireAdmin();if(auth.error)return auth.error;
  const {id}=await params;
  try{const payment=await db.payment.findUnique({where:{id:BigInt(id)},select:{proofPath:true,proofMimeType:true,proofOriginalName:true}});if(!payment?.proofPath)return jsonResponse({error:"Bukti pembayaran tidak ditemukan."},{status:404});const result=await readFile(payment.proofPath);const bytes=await result.Body?.transformToByteArray();if(!bytes)return jsonResponse({error:"Bukti pembayaran kosong."},{status:404});const body=new Blob([new Uint8Array(bytes).buffer as ArrayBuffer],{type:payment.proofMimeType??"application/octet-stream"});const disposition=new URL(request.url).searchParams.get("download")==="1"?"attachment":"inline";return new NextResponse(body,{headers:{"Content-Type":payment.proofMimeType??"application/octet-stream","Content-Length":String(bytes.byteLength),"Content-Disposition":`${disposition}; filename*=UTF-8''${encodeURIComponent(payment.proofOriginalName??"bukti-pembayaran")}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}catch{return jsonResponse({error:"Bukti pembayaran belum tersedia."},{status:503});}
}
