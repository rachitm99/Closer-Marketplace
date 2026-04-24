import { NextRequest, NextResponse } from "next/server";
import { clearAuthSession } from "@/lib/auth-session";

export async function POST(request: NextRequest) {
  await clearAuthSession();
  return NextResponse.json({ ok: true, redirectTo: new URL("/", request.nextUrl.origin).toString() });
}
