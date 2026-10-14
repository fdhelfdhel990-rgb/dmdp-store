import { publicFileUrl } from "@/lib/r2";

export async function GET(_request: Request, context: RouteContext<"/api/public/images/[...key]">) {
  const { key } = await context.params;

  if (key.length === 0 || key.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
    return new Response("Invalid image path.", { status: 400 });
  }

  try {
    const upstream = await fetch(publicFileUrl(key.join("/")), { cache: "no-store", redirect: "error" });

    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
    }

    const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType?.startsWith("image/")) {
      return new Response(null, { status: 415 });
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
