import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

async function readKind(token?: string) {
  if (!token || !process.env.AUTH_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload as { kind?: string }).kind ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const staff = await readKind(request.cookies.get("nera_staff")?.value);
  const customer = await readKind(request.cookies.get("nera_customer")?.value);

  if (pathname.startsWith("/admin") || pathname.startsWith("/pos")) {
    if (staff !== "staff") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/compte") && !pathname.startsWith("/compte/connexion") && !pathname.startsWith("/compte/inscription")) {
    if (customer !== "customer") {
      const url = request.nextUrl.clone();
      url.pathname = "/compte/connexion";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/pos", "/pos/:path*", "/compte/:path*"],
};
