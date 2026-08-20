import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";

export default async function RootPage() {
  const session = await getAuthSession();
  redirect(session ? "/dashboard" : "/login");
}
