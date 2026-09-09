import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FollowStoreButton } from "@/components/follow-store-button";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import type { Store } from "@/lib/types";
import { formatStoreAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MagasinsSuivisPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const rows = await sql`
    select m.id, m.nom, m.adresse, m.code_postal, m.ville
    from public.magasins m
    join public.magasins_suivis ms on ms.magasin_id = m.id
    where ms.utilisateur_id = ${session.user.id} and m.masque = false
    order by m.nom
  `;
  const followedStores = (
    rows as { id: string; nom: string; adresse: string; code_postal: string | null; ville: string }[]
  ).map(
    (m): Pick<Store, "id" | "name" | "address" | "postalCode" | "city"> => ({
      id: m.id,
      name: m.nom,
      address: m.adresse,
      postalCode: m.code_postal ?? undefined,
      city: m.ville,
    })
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
        <h1 className="text-lg font-semibold">Magasins suivis ({followedStores.length})</h1>
      </header>

      <div className="flex flex-col gap-2 p-4">
        {followedStores.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun magasin suivi pour l&apos;instant.</p>
        ) : (
          followedStores.map((store) => (
            <Card key={store.id} className="flex-row items-stretch gap-3 p-0">
              <div className="min-w-0 flex-1 py-3 pl-3">
                <p className="truncate text-sm font-medium">{store.name}</p>
                <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  <MapPin className="size-3 shrink-0" />
                  {formatStoreAddress(store)}
                </p>
              </div>
              <div className="flex items-center py-3 pr-3">
                <FollowStoreButton storeId={store.id} initialFollowed />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
