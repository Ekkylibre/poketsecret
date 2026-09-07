import { Crown, Star } from "lucide-react";
import Link from "next/link";

import { signOut } from "./actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { mockCurrentUser, mockProducts } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Connecte-toi pour ajouter des magasins, signaler des dispos et suivre des produits.
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button asChild>
              <Link href="/auth/sign-in">Se connecter</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/sign-up">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rows = await sql`
    select pseudo, reputation, est_premium
    from public.profils_utilisateurs
    where id = ${session.user.id}
  `;
  const profil = rows[0] as
    | { pseudo: string; reputation: number; est_premium: boolean }
    | undefined;

  const followedProducts = mockProducts.filter((p) =>
    mockCurrentUser.followedProductIds.includes(p.id)
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 p-4">
        <Card className="flex-row items-center gap-3 p-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg font-semibold">
              {(profil?.pseudo ?? session.user.name).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="flex items-center gap-1.5 text-base font-semibold">
              {profil?.pseudo ?? session.user.name}
              {profil?.est_premium && <Crown className="size-4 fill-amber-400 text-amber-400" />}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Star className="size-3 fill-current" />
              Réputation {profil?.reputation ?? "—"}/100
            </p>
          </div>
        </Card>

        {!profil?.est_premium && <Button className="w-full">Passer Premium</Button>}

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Produits suivis ({followedProducts.length})
          </h2>
          <Card className="gap-0 px-3 py-1">
            {followedProducts.map((product, i) => (
              <div key={product.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {product.series} · {product.setName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
