import { redirect } from "next/navigation";

// Página legacy de Supabase - Redirigir a Clerk
export default function LoginPage() {
  redirect("/sign-in");
}
