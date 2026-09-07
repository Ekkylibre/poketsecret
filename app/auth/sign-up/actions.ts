"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
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

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  try {
    await sql`insert into public.profils_utilisateurs (id, pseudo) values (${session.user.id}, ${pseudo})`;
  } catch {
    return {
      error: "Compte créé mais le profil n'a pas pu être initialisé (pseudo déjà pris ?).",
    };
  }

  redirect("/profil");
}
