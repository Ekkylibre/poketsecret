"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export async function signOut() {
  await auth.signOut();
  redirect("/profil");
}

export interface ChangePasswordState {
  error?: string;
  success?: boolean;
}

export async function changePassword(
  _prevState: ChangePasswordState | null,
  formData: FormData
): Promise<ChangePasswordState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { error: "Connecte-toi pour changer ton mot de passe." };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Merci de remplir tous les champs." };
  }
  if (newPassword.length < 8) {
    return { error: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const { error } = await auth.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: true,
  });

  if (error) {
    return { error: error.message || "Impossible de changer le mot de passe." };
  }
  return { success: true };
}

export interface DeleteAccountState {
  error?: string;
}

export async function deleteAccount(
  _prevState: DeleteAccountState | null,
  formData: FormData
): Promise<DeleteAccountState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return { error: "Connecte-toi pour supprimer ton compte." };
  }

  const password = formData.get("password") as string;
  if (!password) {
    return { error: "Merci de saisir ton mot de passe pour confirmer." };
  }

  const { error } = await auth.deleteUser({ password });
  if (error) {
    return { error: error.message || "Impossible de supprimer le compte." };
  }

  redirect("/");
}
