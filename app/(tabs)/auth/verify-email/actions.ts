"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export interface VerifyEmailState {
  error?: string;
}

/** Corrige une faille trouvée lors d'un audit de sécurité : la connexion réussissait
 *  même sans jamais compléter l'OTP d'inscription (require_email_verification est à
 *  false côté Neon Auth, aucun outil MCP ne permet de le changer). requireSession()
 *  redirige maintenant ici tant que session.user.emailVerified est faux, cette page est
 *  donc le seul moyen de débloquer un compte connecté mais non vérifié. */
export async function verifyEmailOtp(
  _prevState: VerifyEmailState | null,
  formData: FormData
): Promise<VerifyEmailState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  if (session.user.emailVerified) {
    redirect("/profil");
  }

  const otp = (formData.get("otp") as string)?.trim();
  if (!otp) {
    return { error: "Merci de saisir le code reçu par email." };
  }

  const { error } = await auth.emailOtp.verifyEmail({ email: session.user.email, otp });
  if (error) {
    return { error: error.message || "Code incorrect ou expiré." };
  }

  redirect("/profil");
}

/** Appelée directement depuis le client (pas de <form>), même pattern que
 *  resendSignUpOtp. */
export async function resendVerifyEmailOtp() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  await auth.emailOtp.sendVerificationOtp({ email: session.user.email, type: "email-verification" }).catch(() => {});
}
