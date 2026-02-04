import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Truck } from "lucide-react";

export default async function Home() {
  const { userId, orgId } = await auth();

  if (userId && orgId) {
    redirect("/dashboard");
  }

  if (userId && !orgId) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Fleet Care
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          Gestión inteligente de flotas y mantenimiento
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
        routing="hash"
      />
    </div>
  );
}