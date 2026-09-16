import { CircleCheck, Lock, Mail, MapPin, Star, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { openBillingPortal, signOut, startPremiumCheckout } from "./actions";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { FollowProductButton } from "@/components/follow-product-button";
import { FollowStoreButton } from "@/components/follow-store-button";
import { HelpCard } from "@/components/help-card";
import { ModifierPseudoDialog } from "@/components/modifier-pseudo-dialog";
import { NotificationNudgeBubble } from "@/components/notification-nudge-bubble";
import { NotificationPermissionToggle } from "@/components/notification-permission-toggle";
import { ReputationCard } from "@/components/reputation-card";
import { UnfollowExtensionButton } from "@/components/unfollow-extension-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { ensureProfil } from "@/lib/profil";
import { fetchFollowedProducts, fetchFollowState, fetchStores, splitFollowedProducts } from "@/lib/queries";
import {
  countMagasinsCetteSemaine,
  countNouvellesAnnoncesToday,
  countSignalementsToday,
  countVotesToday,
} from "@/lib/reputation";
import { stripe } from "@/lib/stripe";
import { formatStoreAddress } from "@/lib/utils";

// Au-delà, la liste complète se consulte sur sa propre page plutôt que de tout
// charger d'un coup ici (pertinent surtout pour un compte premium, illimité).
const FEATURED_LIMIT = 5;

// Même ordre/nombre de lignes des deux côtés pour une comparaison directe : quand le
// gratuit n'a pas la fonctionnalité, `free` est null et la ligne s'affiche cadenassée.
const PLAN_FEATURES: { label: string; free: string | null; premium: string }[] = [
  { label: "Extensions suivies", free: "1 extension suivie", premium: "Extensions suivies illimitées" },
  { label: "Magasins suivis", free: "1 magasin suivi", premium: "Magasins suivis illimités" },
  { label: "Notifications en temps réel", free: null, premium: "Notifications en temps réel" },
  { label: "Épingler un produit", free: null, premium: "Épingler un produit" },
];

export const dynamic = "force-dynamic";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const { data: session } = await auth.getSession();
  const { checkout, session_id: checkoutSessionId } = await searchParams;

  // La page de connexion couvre déjà "se connecter"/"créer un compte" (avec Google, mot
  // de passe oublié, etc.), pas besoin de dupliquer ce contenu ici, on y renvoie
  // directement.
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Retour de Stripe Checkout : on vérifie la session de paiement plutôt que de faire
  // confiance au seul paramètre d'URL, puis on passe le compte en Premium.
  if (checkout === "success" && checkoutSessionId) {
    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    if (checkoutSession.metadata?.userId === session.user.id && checkoutSession.status === "complete") {
      await sql`
        update public.profils_utilisateurs
        set
          est_premium = true,
          stripe_customer_id = ${checkoutSession.customer as string},
          stripe_subscription_id = ${checkoutSession.subscription as string},
          modifie_le = now()
        where id = ${session.user.id}
      `;
    }
  }

  // Seule l'inscription email/mot de passe crée cette ligne, un compte Google n'en a
  // jamais sans ça, donc reputation/premium/etc. resteraient bloqués à leurs défauts.
  await ensureProfil(session.user.id, session.user.name);
  const profilRows = await sql`
    select pseudo, reputation, est_premium, pseudo_signale
    from public.profils_utilisateurs
    where id = ${session.user.id}
  `;
  const profil = profilRows[0] as
    | { pseudo: string; reputation: number; est_premium: boolean; pseudo_signale: boolean }
    | undefined;

  const displayName = profil?.pseudo ?? session.user.name ?? "Utilisateur";
  const email = session.user.email;
  const reputation = profil?.reputation ?? 0;
  const isPremium = profil?.est_premium ?? false;

  const [followState, followedProductRows, allStores, votesUsed, signalementsUsed, annoncesUsed, magasinsUsed] =
    await Promise.all([
      fetchFollowState(session.user.id),
      fetchFollowedProducts(session.user.id),
      fetchStores(),
      countVotesToday(session.user.id),
      countSignalementsToday(session.user.id),
      countNouvellesAnnoncesToday(session.user.id),
      countMagasinsCetteSemaine(session.user.id),
    ]);
  const { extensions: followedExtensions, individual: followedIndividualProducts } =
    splitFollowedProducts(followedProductRows);
  const followedStores = allStores.filter((s) => followState.followedStoreIds.includes(s.id));
  // Consommé aujourd'hui/cette semaine sur les quotas de paliers, affiché en "X/Y" dans
  // ReputationCard : sans ça, ces quotas ne vivaient que côté serveur, l'utilisateur
  // n'avait aucun moyen de savoir où il en est.
  const quotaUsage = {
    votes: votesUsed,
    signalements: signalementsUsed,
    nouvellesAnnonces: annoncesUsed,
    magasins: magasinsUsed,
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 p-4">
        {profil?.pseudo_signale && (
          <div className="bg-destructive/15 text-destructive flex items-start gap-2 rounded-md px-3 py-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs">
              Ton pseudo a été signalé par la communauté : les autres utilisateurs voient
              &quot;Utilisateur signalé&quot; à la place, sur toutes tes annonces et magasins.
              Choisis-en un nouveau (crayon ci-dessous) pour lever cette restriction.
            </p>
          </div>
        )}

        <Card className="gap-0 p-0">
          {/* Photo à gauche, dimensionnée pour courir jusqu'à la ligne notifications ;
              le reste (nom, réputation, email, notifications) se décale dans une colonne
              à sa droite plutôt que de s'empiler en pleine largeur sous une petite photo. */}
          <div className="flex items-stretch gap-3 px-4 pt-4 pb-3">
            <Avatar className="size-28 shrink-0 self-center">
              <AvatarFallback className="text-3xl font-semibold">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
              <div>
                <div className="flex items-center gap-1">
                  <p className="min-w-0 truncate text-base font-semibold">{displayName}</p>
                  <ModifierPseudoDialog currentPseudo={displayName} />
                </div>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Star className="size-3 fill-current" />
                  Réputation {reputation}/100
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4 shrink-0" />
                <p className="min-w-0 truncate text-sm font-medium">{email}</p>
              </div>
              {/* La bulle d'incitation (NotificationNudgeBubble) flotte en absolute
                  par-dessus la ligne email au-dessus (z-10), volontairement sans marge
                  supplémentaire ici pour ne pas espacer les lignes du reste du temps. */}
              <div className="relative">
                <NotificationPermissionToggle premiumLocked={!isPremium} className="px-0 py-0" />
                <NotificationNudgeBubble isPremium={isPremium} />
              </div>
            </div>
          </div>
        </Card>

        <ReputationCard reputation={reputation} usage={quotaUsage} />

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
                  <p className="text-sm font-semibold text-amber-400">Premium</p>
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
              <form action={isPremium ? openBillingPortal : startPremiumCheckout}>
                <Button type="submit" size="sm" className="mt-1 w-full">
                  {isPremium ? "Gérer l'abonnement" : "Passer Premium"}
                </Button>
              </form>
              {!isPremium && (
                <p className="text-muted-foreground text-center text-[10px]">
                  En t&apos;abonnant, tu acceptes les{" "}
                  <Link href="/legal/cgv" className="underline underline-offset-2">
                    CGV
                  </Link>
                  .
                </p>
              )}
            </Card>
          </div>
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
            Extensions suivies ({followedExtensions.length})
          </h2>
          {followedExtensions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune extension suivie pour l&apos;instant.</p>
          ) : (
            <Card className="gap-0 px-3 py-1">
              {followedExtensions.slice(0, FEATURED_LIMIT).map((ext, i) => (
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
          {followedExtensions.length > FEATURED_LIMIT && (
            <Link
              href="/profil/extensions-suivies"
              className="text-primary mt-2 block py-1 text-center text-sm font-medium underline underline-offset-2"
            >
              Voir tout ({followedExtensions.length})
            </Link>
          )}
        </div>

        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Produits suivis ({followedIndividualProducts.length})
          </h2>
          {followedIndividualProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun produit suivi individuellement.</p>
          ) : (
            <Card className="gap-0 px-3 py-1">
              {followedIndividualProducts.slice(0, FEATURED_LIMIT).map((product, i) => (
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
          )}
          {followedIndividualProducts.length > FEATURED_LIMIT && (
            <Link
              href="/profil/produits-suivis"
              className="text-primary mt-2 block py-1 text-center text-sm font-medium underline underline-offset-2"
            >
              Voir tout ({followedIndividualProducts.length})
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

        <HelpCard />

        <p className="text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-xs">
          <Link href="/legal/mentions-legales" className="underline underline-offset-2">
            Mentions légales
          </Link>
          <Link href="/legal/cgu" className="underline underline-offset-2">
            CGU
          </Link>
          <Link href="/legal/cgv" className="underline underline-offset-2">
            CGV
          </Link>
        </p>

        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
