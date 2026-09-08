"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) {
    return { error: "Merci de remplir tous les champs." };
  }

  const { error } = await auth.signIn.email({ email, password, rememberMe });

  if (error) {
    return { error: error.message || "Impossible de se connecter." };
  }

  redirect("/profil");
}
