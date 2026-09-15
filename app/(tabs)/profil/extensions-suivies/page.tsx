import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UnfollowExtensionButton } from "@/components/unfollow-extension-button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth/server";
import { fetchFollowedProducts, splitFollowedProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ExtensionsSuiviesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const { extensions: followedExtensions } = splitFollowedProducts(
    await fetchFollowedProducts(session.user.id)
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b p-4">
        <Link
          href="/profil"
          aria-label="Retour au profil"
          className="text-muted-foreground hover:bg-accent -ml-1 flex size-8 shrink-0 items-center justify-center rounded-md"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-lg font-semibold">Extensions suivies ({followedExtensions.length})</h1>
      </header>

      <div className="p-4">
        {followedExtensions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune extension suivie pour l&apos;instant.</p>
        ) : (
          <Card className="gap-0 px-3 py-1">
            {followedExtensions.map((ext, i) => (
              <div key={`${ext.series}|||${ext.setName}`}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ext.setName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {ext.series} · {ext.typeCount} type{ext.typeCount > 1 ? "s" : ""} suivi
                      {ext.typeCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <UnfollowExtensionButton
                    series={ext.series}
                    setName={ext.setName}
                    className="bg-transparent backdrop-blur-none"
                  />
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
