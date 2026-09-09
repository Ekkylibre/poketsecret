import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FollowProductButton } from "@/components/follow-product-button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProduitsSuivisPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const rows = await sql`
    select p.id, p.nom, p.serie, p.extension
    from public.produits p
    join public.produits_suivis ps on ps.produit_id = p.id
    where ps.utilisateur_id = ${session.user.id}
    order by p.nom
  `;
  const followedProducts = rows as { id: string; nom: string; serie: string | null; extension: string }[];

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
        <h1 className="text-lg font-semibold">Produits suivis ({followedProducts.length})</h1>
      </header>

      <div className="p-4">
        {followedProducts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun produit suivi pour l&apos;instant.</p>
        ) : (
          <Card className="gap-0 px-3 py-1">
            {followedProducts.map((product, i) => (
              <div key={product.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.nom}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {product.serie} · {product.extension}
                    </p>
                  </div>
                  <FollowProductButton
                    productId={product.id}
                    initialFollowed
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
