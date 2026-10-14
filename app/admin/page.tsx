import Image from "next/image";
import Link from "next/link";

export const instant = false;

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  return <main className="admin-login"><form className="login-card" action="/api/admin/login" method="post"><Link href="/"><Image src="/images/branding/dmt-print-logo.svg" width={135} height={43} alt="DMT Print"/></Link><h1>Selamat datang kembali</h1><p>Masuk ke panel pengelolaan DMT Print.</p>{params.error && <div className="notice">Email atau kata sandi tidak sesuai.</div>}<div className="field"><label htmlFor="email">Email admin</label><input id="email" name="email" type="email" autoComplete="username" required/></div><div className="field"><label htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" autoComplete="current-password" required/></div><button className="button button-primary" style={{width:"100%",justifyContent:"space-between"}}>Masuk ke dashboard <span>↗</span></button><p style={{marginTop:22,textAlign:"center"}}><Link href="/" className="page-subtitle">← Kembali ke website</Link></p></form></main>;
}
