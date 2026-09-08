"use server";

import { auth } from "@/lib/auth/server";

export async function resetPassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const newPassword = formData.get("password") as string;
  const token = formData.get("token") as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }
  if (!token) {
    return { error: "Lien de réinitialisation invalide ou expiré." };
  }

  const { error } = await auth.resetPassword({ newPassword, token });

  if (error) {
    return { error: error.message || "Impossible de réinitialiser le mot de passe." };
  }

  return { success: true };
}
