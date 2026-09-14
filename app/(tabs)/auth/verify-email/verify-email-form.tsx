"use client";

import { useActionState, useState } from "react";

import { resendVerifyEmailOtp, verifyEmailOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(verifyEmailOtp, null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResend() {
    setResendState("sending");
    await resendVerifyEmailOtp();
    setResendState("sent");
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Vérifie ton email</h1>
        <p className="text-muted-foreground text-sm">
          Pour continuer, confirme <span className="text-foreground">{email}</span> avec le
          code reçu par email (ou demande-en un nouveau ci-dessous).
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp" className="text-sm font-medium">
            Code de vérification
          </label>
          <Input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="123456"
            className="text-center text-lg tracking-[0.5em]"
          />
        </div>

        {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Vérification..." : "Vérifier"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {resendState === "sent" ? (
          "Nouveau code envoyé !"
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === "sending"}
            className="text-foreground underline underline-offset-2 disabled:opacity-50"
          >
            Renvoyer le code
          </button>
        )}
      </p>
    </>
  );
}
