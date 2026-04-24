import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    userId: session.userId ?? "",
    userName: session.userName ?? "",
    expiresAt: session.expiresAt,
  });
}
