"use client";

import Link from "next/link";
import { type FormEvent, useActionState, useEffect, useRef } from "react";

import { signInWithEmail } from "./actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

// Distinct de la case "Se souvenir de moi" (qui règle la durée de la SESSION, voir
// actions.ts) : ceci ne fait que réafficher le dernier email saisi, y compris après une
// déconnexion volontaire, pour éviter d'avoir à le retaper — indépendant de la case à
// cocher. Rempli via ref + useEffect (pas defaultValue) : defaultValue ne s'applique
// qu'au montage initial, une valeur lue après coup depuis localStorage ne le
// re-déclencherait pas ; un effet qui écrit .value directement sur l'input évite aussi
// tout risque de désaccord serveur/client au rendu (rien n'est lu pendant le rendu).
const LAST_EMAIL_KEY = "poketsecret-last-email";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem(LAST_EMAIL_KEY);
    if (savedEmail && emailInputRef.current) {
      emailInputRef.current.value = savedEmail;
    }
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const email = (new FormData(e.currentTarget).get("email") as string)?.trim();
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
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
        <div>
          <h1 className="text-lg font-semibold">Connexion</h1>
        </div>

        <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              ref={emailInputRef}
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
            <PasswordInput id="password" name="password" autoComplete="current-password" required />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="rememberMe" defaultChecked />
              Se souvenir de moi
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-muted-foreground text-sm underline underline-offset-2"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-xs">ou</span>
          <div className="bg-border h-px flex-1" />
        </div>

        <GoogleSignInButton label="Continuer avec Google" />

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
