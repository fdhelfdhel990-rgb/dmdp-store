import { notFound } from "next/navigation";
import AdminWorkspace from "@/app/admin/_components/admin-workspace";

export const instant = false;

const sections: Record<string, string> = { pesanan: "Pesanan", produk: "Produk", kategori: "Kategori", stok: "Stok", "buku-kas": "Buku kas", "tampilan-web": "Tampilan web", pengaturan: "Pengaturan" };

export default async function AdminSectionPage({ params }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  const title = sections[section];
  if (!title) notFound();
  return <AdminWorkspace section={title}/>;
}
