import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMT Print — Digital Printing & Custom Merchandise",
  description: "Ide hebat layak dicetak sempurna. Layanan digital printing dan custom merchandise berkualitas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
