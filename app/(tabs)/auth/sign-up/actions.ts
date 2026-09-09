"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export interface SignUpState {
  error?: string;
  needsVerification?: boolean;
  email?: string;
  pseudo?: string;
}

export async function signUpWithEmail(
  _prevState: SignUpState | null,
  formData: FormData
): Promise<SignUpState> {
  const pseudo = (formData.get("pseudo") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!pseudo || !email || !password) {
    return { error: "Merci de remplir tous les champs." };
  }

  const { error: signUpError } = await auth.signUp.email({
    email,
    name: pseudo,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message || "Impossible de créer le compte." };
  }

  // Le compte existe mais reste à confirmer avant de créer son profil et de le laisser
  // entrer : un code à 6 chiffres part par email (email_verification_method: "otp" côté
  // config Neon Auth). Best effort sur l'envoi : une erreur ici ne doit pas bloquer
  // l'inscription, l'utilisateur peut redemander un code depuis l'écran suivant.
  await auth.emailOtp.sendVerificationOtp({ email, type: "email-verification" }).catch(() => {});

  return { needsVerification: true, email, pseudo };
}

export interface VerifySignUpOtpState {
  error?: string;
}

export async function verifySignUpOtp(
  _prevState: VerifySignUpOtpState | null,
  formData: FormData
): Promise<VerifySignUpOtpState> {
  const email = (formData.get("email") as string)?.trim();
  const pseudo = (formData.get("pseudo") as string)?.trim();
  const otp = (formData.get("otp") as string)?.trim();

  if (!email || !pseudo || !otp) {
    return { error: "Merci de saisir le code reçu par email." };
  }

  const { error } = await auth.emailOtp.verifyEmail({ email, otp });
  if (error) {
    return { error: error.message || "Code incorrect ou expiré." };
  }

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  try {
    await sql`
      insert into public.profils_utilisateurs (id, pseudo) values (${session.user.id}, ${pseudo})
      on conflict (id) do nothing
    `;
  } catch {
    return {
      error: "Compte vérifié mais le profil n'a pas pu être initialisé (pseudo déjà pris ?).",
    };
  }

  redirect("/profil");
}

/** Appelée directement depuis le client (pas de <form>) par le lien "Renvoyer le code". */
export async function resendSignUpOtp(email: string) {
  await auth.emailOtp.sendVerificationOtp({ email, type: "email-verification" }).catch(() => {});
}
