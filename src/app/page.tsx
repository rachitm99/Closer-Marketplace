import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";

export default async function Home() {
  const session = await getAuthSession();
  redirect(session?.accessToken ? "/dashboard" : "/login");
}
