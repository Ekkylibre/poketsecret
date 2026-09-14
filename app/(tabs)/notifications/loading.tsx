import { NotificationsContentSkeleton } from "@/components/notifications-content-skeleton";
import { SignInFormSkeleton } from "@/components/sign-in-form-skeleton";
import { auth } from "@/lib/auth/server";

// Même raison que profil/loading.tsx : sans savoir si l'utilisateur a une session, un
// skeleton statique se trompe forcément pour l'un des deux cas.
export default async function Loading() {
  const { data: session } = await auth.getSession();

  return session?.user ? <NotificationsContentSkeleton /> : <SignInFormSkeleton />;
}
