"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInWithEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm gap-5 p-5">
        <div>
          <h1 className="text-lg font-semibold">Se connecter</h1>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" required placeholder="toi@exemple.fr" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <Input id="password" name="password" type="password" required />
          </div>

          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/auth/sign-up" className="text-foreground underline underline-offset-2">
            Créer un compte
          </Link>
        </p>
      </Card>
    </div>
  );
}
