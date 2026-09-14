import { redirect } from "next/navigation";

import { VerifyEmailForm } from "./verify-email-form";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  if (session.user.emailVerified) {
    redirect("/profil");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo className="size-14" />
        <p className="text-base font-semibold tracking-tight">
          Poket<span className="text-[#f2a93c]">Secret</span>
        </p>
      </div>

      <Card className="w-full max-w-sm gap-5 p-5">
        <VerifyEmailForm email={session.user.email} />
      </Card>
    </div>
  );
}
