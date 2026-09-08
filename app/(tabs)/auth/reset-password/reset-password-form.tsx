"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm gap-5 p-5">
        <div>
          <h1 className="text-lg font-semibold">Nouveau mot de passe</h1>
        </div>

        {!token ? (
          <p className="text-destructive text-sm">
            Lien de réinitialisation invalide ou expiré. Redemande-en un depuis la page de
            connexion.
          </p>
        ) : state?.success ? (
          <p className="text-muted-foreground text-sm">
            Mot de passe mis à jour — tu peux te connecter avec.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <PasswordInput id="password" name="password" required minLength={8} />
            </div>

            {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Enregistrement..." : "Réinitialiser le mot de passe"}
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
