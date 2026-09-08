import { CircleCheck, Crown, Lock, Mail, MapPin, Star, User } from "lucide-react";
import Link from "next/link";

import { signOut } from "./actions";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { FollowProductButton } from "@/components/follow-product-button";
import { FollowStoreButton } from "@/components/follow-store-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { mockCurrentUser, mockProducts, mockStores } from "@/lib/mock-data";
import { formatStoreAddress } from "@/lib/utils";

// Pas encore de champ email côté mock — seule la session réelle en fournit un.
const MOCK_EMAIL = "didoux@example.com";

// Au-delà, la liste complète se consulte sur sa propre page plutôt que de tout
// charger d'un coup ici (pertinent surtout pour un compte premium, illimité).
const FEATURED_LIMIT = 5;

// Même ordre/nombre de lignes des deux côtés pour une comparaison directe : quand le
// gratuit n'a pas la fonctionnalité, `free` est null et la ligne s'affiche cadenassée.
const PLAN_FEATURES: { label: string; free: string | null; premium: string }[] = [
  { label: "Produits suivis", free: "1 produit suivi", premium: "Produits suivis illimités" },
  { label: "Magasins suivis", free: "1 magasin suivi", premium: "Magasins suivis illimités" },
  { label: "Notifications en temps réel", free: null, premium: "Notifications en temps réel" },
  { label: "Épingler un produit", free: null, premium: "Épingler un produit" },
  { label: "Badge Couronne sur le profil", free: null, premium: "Badge Couronne sur le profil" },
];

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { data: session } = await auth.getSession();

  let profil: { pseudo: string; reputation: number; est_premium: boolean } | undefined;
  if (session?.user) {
    const rows = await sql`
      select pseudo, reputation, est_premium
      from public.profils_utilisateurs
      where id = ${session.user.id}
    `;
    profil = rows[0] as typeof profil;
  }

  // Phase de dev : sans session réelle, on affiche le profil mock plutôt que de bloquer
  // l'écran derrière un vrai login à chaque fois.
  const displayName = profil?.pseudo ?? session?.user?.name ?? mockCurrentUser.username;
  const email = session?.user?.email ?? MOCK_EMAIL;
  const reputation = profil?.reputation ?? mockCurrentUser.reputation;
  const isPremium = profil?.est_premium ?? mockCurrentUser.isPremium;

  const followedProducts = mockProducts.filter((p) =>
    mockCurrentUser.followedProductIds.includes(p.id)
  );
  const followedStores = mockStores.filter((s) => mockCurrentUser.followedStoreIds.includes(s.id));

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 p-4">
        {!session?.user && (
          <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
            Mode démo — connecte-toi pour voir ton vrai profil.
          </p>
        )}

        <Card className="flex-row items-center gap-3 p-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg font-semibold">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="flex items-center gap-1.5 text-base font-semibold">
              {displayName}
              {isPremium && <Crown className="size-4 fill-amber-400 text-amber-400" />}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Star className="size-3 fill-current" />
              Réputation {reputation}/100
            </p>
          </div>
        </Card>

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">Formules</h2>
          <div className="flex items-stretch gap-3">
            <Card className="min-w-0 flex-1 basis-0 gap-3 p-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Gratuit</p>
                  {!isPremium && (
                    <Badge variant="secondary" className="text-[10px]">
                      Actuel
                    </Badge>
                  )}
                </div>
                {/* Espace réservé pour aligner le listing sur la ligne de prix du bloc Premium. */}
                <span aria-hidden="true" className="invisible text-sm font-semibold">
                  0 €
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {PLAN_FEATURES.map((f) =>
                  f.free ? (
                    <li key={f.label} className="text-muted-foreground flex items-start gap-1.5 text-xs">
                      <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
                      {f.free}
                    </li>
                  ) : (
                    <li key={f.label} className="text-muted-foreground/50 flex items-start gap-1.5 text-xs">
                      <Lock className="mt-0.5 size-3.5 shrink-0" />
                      {f.label}
                    </li>
                  )
                )}
              </ul>
            </Card>

            <Card className="border-amber-400/40 min-w-0 flex-1 basis-0 gap-3 p-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-400">
                    <Crown className="size-4 fill-current" />
                    Premium
                  </p>
                  {isPremium && (
                    <Badge variant="secondary" className="text-[10px]">
                      Actuel
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-semibold">9,99 €/mois</span>
              </div>
              <ul className="flex flex-col gap-2">
                {PLAN_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-start gap-1.5 text-xs">
                    <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                    {f.premium}
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-1 w-full">
                {isPremium ? "Gérer l'abonnement" : "Passer Premium"}
              </Button>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">Coordonnées</h2>
          <Card className="gap-0 px-4 py-1">
            <div className="flex items-center gap-3 py-2.5">
              <User className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Pseudo</p>
                <p className="truncate text-sm font-medium">{displayName}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3 py-2.5">
              <Mail className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="truncate text-sm font-medium">{email}</p>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Magasins suivis ({followedStores.length})
          </h2>
          {followedStores.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun magasin suivi pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {followedStores.slice(0, FEATURED_LIMIT).map((store) => (
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
              ))}
              {followedStores.length > FEATURED_LIMIT && (
                <Link
                  href="/profil/magasins-suivis"
                  className="text-primary py-1 text-center text-sm font-medium underline underline-offset-2"
                >
                  Voir tout ({followedStores.length})
                </Link>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Produits suivis ({followedProducts.length})
          </h2>
          <Card className="gap-0 px-3 py-1">
            {followedProducts.slice(0, FEATURED_LIMIT).map((product, i) => (
              <div key={product.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {product.series} · {product.setName}
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
          {followedProducts.length > FEATURED_LIMIT && (
            <Link
              href="/profil/produits-suivis"
              className="text-primary mt-2 block py-1 text-center text-sm font-medium underline underline-offset-2"
            >
              Voir tout ({followedProducts.length})
            </Link>
          )}
        </div>

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">Sécurité</h2>
          <Card className="gap-0 px-4 py-1">
            <ChangePasswordDialog />
            <Separator />
            <DeleteAccountDialog />
          </Card>
        </div>

        {session?.user ? (
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Se déconnecter
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/auth/sign-in">Se connecter</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/sign-up">Créer un compte</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
