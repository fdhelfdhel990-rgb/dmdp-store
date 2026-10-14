export const categories = [
  { name: "Merchandise & Souvenir", slug: "merchandise-souvenir", icon: "✦" },
  { name: "Print Warna", slug: "print-warna", icon: "▧" },
  { name: "Stiker", slug: "stiker", icon: "◉" },
  { name: "Packaging UMKM", slug: "packaging-umkm", icon: "▱" },
  { name: "Poster", slug: "poster", icon: "▤" },
  { name: "Kalender", slug: "kalender", icon: "▦" },
  { name: "Banner", slug: "banner", icon: "▥" },
  { name: "Kartu Nama", slug: "kartu-nama", icon: "▰" },
  { name: "Stempel", slug: "stempel", icon: "◍" },
];

export const products = [
  { name: "Cetak Stiker Vinyl", slug: "cetak-stiker-vinyl", category: "Stiker", price: 35000, unit: "lembar", tone: "cyan", tag: "Terlaris", sku: "DMT-STK-01" },
  { name: "Kartu Nama Premium", slug: "kartu-nama-premium", category: "Kartu Nama", price: 65000, unit: "box", tone: "navy", tag: "Favorit", sku: "DMT-KNM-01" },
  { name: "X-Banner Indoor", slug: "x-banner-indoor", category: "Banner", price: 115000, unit: "set", tone: "yellow", tag: "", sku: "DMT-BNR-01" },
  { name: "Brosur A5 Full Color", slug: "brosur-a5-full-color", category: "Print Warna", price: 45000, unit: "100 lembar", tone: "magenta", tag: "Cepat", sku: "DMT-PRW-01" },
  { name: "Stempel Flash K3", slug: "stempel-flash-k3", category: "Stempel", price: 95000, unit: "pcs", tone: "red", tag: "", sku: "DMT-STP-03" },
  { name: "Paper Bag Custom", slug: "paper-bag-custom", category: "Packaging UMKM", price: 8500, unit: "pcs", tone: "green", tag: "", sku: "DMT-PKG-01" },
  { name: "Tumbler Custom", slug: "tumbler-custom", category: "Merchandise & Souvenir", price: 75000, unit: "pcs", tone: "blue", tag: "Baru", sku: "DMT-MER-01" },
  { name: "Poster A3+", slug: "poster-a3-plus", category: "Poster", price: 12000, unit: "lembar", tone: "orange", tag: "", sku: "DMT-PST-01" },
];

export const rupiah = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
