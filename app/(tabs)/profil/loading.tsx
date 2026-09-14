import { cookies } from "next/headers";

import { ProfilContentSkeleton } from "@/components/profil-content-skeleton";
import { SignInFormSkeleton } from "@/components/sign-in-form-skeleton";
import { auth } from "@/lib/auth/server";

// Async (pas la norme pour un loading.tsx, qui est censé peindre instantanément) : sans
// ça, impossible de savoir si l'utilisateur a une session avant de choisir le skeleton,
// et un choix statique se trompe forcément pour l'un des deux cas (voir plus bas). Le
// coût (un appel getSession() de plus, en plus de celui déjà fait par page.tsx) est
// mineur comparé à afficher le mauvais skeleton à quelqu'un.
export default async function Loading() {
  const { data: session } = await auth.getSession();
  const cookieStore = await cookies();
  const previewConnected = cookieStore.get("demo-preview-connected")?.value === "1";
  const hasSession = !!session?.user || previewConnected;

  // Avec session : la vraie page va bien afficher un profil, le skeleton doit lui
  // ressembler. Sans session : page.tsx redirige systématiquement vers /auth/sign-in,
  // le skeleton doit annoncer ça plutôt que de laisser croire à un compte déjà connecté.
  return hasSession ? <ProfilContentSkeleton /> : <SignInFormSkeleton />;
}
