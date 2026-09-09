"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm gap-5 p-5">
        <div>
          <h1 className="text-lg font-semibold">Mot de passe oublié</h1>
          <p className="text-muted-foreground text-sm">
            On t&apos;envoie un lien pour en choisir un nouveau.
          </p>
        </div>

        {state?.success ? (
          <p className="text-muted-foreground text-sm">
            Si un compte existe avec cet email, un lien de réinitialisation vient de partir,
            vérifie ta boîte de réception.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="toi@exemple.fr" />
            </div>

            {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Envoi..." : "Envoyer le lien"}
            </Button>
          </form>
        )}

        <p className="text-muted-foreground text-center text-sm">
          <Link href="/auth/sign-in" className="text-foreground underline underline-offset-2">
            Retour à la connexion
          </Link>
        </p>
      </Card>
    </div>
  );
}
