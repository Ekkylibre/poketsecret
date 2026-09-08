"use server";

import { auth } from "@/lib/auth/server";

export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    return { error: "Merci de renseigner ton email." };
  }

  const { error } = await auth.requestPasswordReset({
    email,
    redirectTo: "/auth/reset-password",
  });

  if (error) {
    return { error: error.message || "Impossible d'envoyer l'email de réinitialisation." };
  }

  return { success: true };
}
