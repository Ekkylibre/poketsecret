"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { resendSignUpOtp, signUpWithEmail, verifySignUpOtp } from "./actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

function VerifyOtpStep({ email, pseudo }: { email: string; pseudo: string }) {
  const [state, formAction, isPending] = useActionState(verifySignUpOtp, null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResend() {
    setResendState("sending");
    await resendSignUpOtp(email);
    setResendState("sent");
  }

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Vérifie ton email</h1>
        <p className="text-muted-foreground text-sm">
          On a envoyé un code à 6 chiffres à <span className="text-foreground">{email}</span>.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="pseudo" value={pseudo} />

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

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo className="size-14" />
        <p className="text-base font-semibold tracking-tight">
          Poket<span className="text-[#f2a93c]">Secret</span>
        </p>
      </div>

      <Card className="w-full max-w-sm gap-5 p-5">
        {state?.needsVerification && state.email && state.pseudo ? (
          <VerifyOtpStep email={state.email} pseudo={state.pseudo} />
        ) : (
          <>
            <div>
              <h1 className="text-lg font-semibold">Créer un compte</h1>
              <p className="text-muted-foreground text-sm">
                Pour ajouter des magasins et signaler des dispos.
              </p>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pseudo" className="text-sm font-medium">
                  Pseudo
                </label>
                <Input
                  id="pseudo"
                  name="pseudo"
                  type="text"
                  autoComplete="nickname"
                  required
                  placeholder="PoketSecret"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="poketsecret@exemple.fr"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>

              {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Création..." : "Créer mon compte"}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs">ou</span>
              <div className="bg-border h-px flex-1" />
            </div>

            <GoogleSignInButton label="Continuer avec Google" />

            <p className="text-muted-foreground text-center text-sm">
              Déjà un compte ?{" "}
              <Link href="/auth/sign-in" className="text-foreground underline underline-offset-2">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
