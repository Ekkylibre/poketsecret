"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/require-session";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";
import { mockCurrentUser } from "@/lib/mock-data";
import { ensureProfil } from "@/lib/profil";
import { PREMIUM_PRICE_EUR_CENTS, PREMIUM_PRICE_ID, stripe } from "@/lib/stripe";

export async function signOut() {
  await auth.signOut();
  redirect("/profil");
}

/** Enregistre l'abonnement push renvoyé par pushManager.subscribe() côté client. Un
 *  utilisateur peut avoir plusieurs abonnements (un par navigateur/appareil) : on ne
 *  remplace pas, on ajoute (on conflict sur endpoint, unique par abonnement navigateur). */
export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  await sql`
    insert into public.push_subscriptions (utilisateur_id, endpoint, p256dh, auth)
    values (${user.id}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    on conflict (endpoint) do update set utilisateur_id = excluded.utilisateur_id
  `;
}

/** Appelée quand l'utilisateur désactive les notifications côté app (pas forcément une
 *  vraie désinscription navigateur, mais on arrête d'envoyer vers cet endpoint). Limité à
 *  ses propres abonnements : sans ça, n'importe qui pourrait désabonner n'importe quel
 *  appareil en devinant/connaissant son endpoint. */
export async function deletePushSubscription(endpoint: string) {
  const user = await requireSession();
  await sql`delete from public.push_subscriptions where endpoint = ${endpoint} and utilisateur_id = ${user.id}`;
}

async function currentOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** Démarre un abonnement Premium via Stripe Checkout (mode test tant que le compte
 *  Stripe n'est pas activé) et redirige directement vers la page de paiement. */
export async function startPremiumCheckout() {
  const user = await requireSession();
  await ensureProfil(user.id, user.name);

  const rows = await sql`
    select stripe_customer_id from public.profils_utilisateurs where id = ${user.id}
  `;
  const existingCustomerId = (rows[0] as { stripe_customer_id: string | null } | undefined)
    ?.stripe_customer_id;

  const origin = await currentOrigin();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: user.email }),
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "PokéSecret Premium" },
          unit_amount: PREMIUM_PRICE_EUR_CENTS,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/profil?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/profil?checkout=cancelled`,
    metadata: { userId: user.id },
  });

  if (!checkoutSession.url) {
    redirect("/profil?checkout=error");
  }
  redirect(checkoutSession.url);
}

/** Ouvre le portail de facturation Stripe (annuler/changer de moyen de paiement...). */
export async function openBillingPortal() {
  const user = await requireSession();

  const rows = await sql`
    select stripe_customer_id from public.profils_utilisateurs where id = ${user.id}
  `;
  const customerId = (rows[0] as { stripe_customer_id: string | null } | undefined)
    ?.stripe_customer_id;
  if (!customerId) {
    redirect("/profil?checkout=error");
  }

  const origin = await currentOrigin();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/profil`,
  });

  redirect(portalSession.url);
}

/** Dev uniquement : simule un abonnement avec un vrai objet Stripe (mode test, carte de
 *  test intégrée pm_card_visa) plutôt qu'un simple flag en base, pour ne pas avoir à
 *  ressaisir une carte à chaque fois pendant le développement, tout en gardant "Gérer
 *  l'abonnement" fonctionnel ensuite (vrai portail Stripe, vraie annulation, vrais
 *  webhooks). Jamais exposé en prod (le composant qui l'appelle ne se rend pas non plus
 *  en prod, mais l'action se protège elle-même en plus, au cas où). */
export async function devTogglePremium(enabled: boolean) {
  if (process.env.NODE_ENV === "production") {
    return { error: "Indisponible en production." };
  }

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    // Pas de session réelle (aperçu dev) : pas de compte à qui rattacher un vrai
    // customer Stripe, on reste sur le flag mock.
    mockCurrentUser.isPremium = enabled;
    revalidatePath("/profil");
    return { success: true };
  }

  await ensureProfil(session.user.id, session.user.name);

  const rows = await sql`
    select stripe_customer_id, stripe_subscription_id
    from public.profils_utilisateurs
    where id = ${session.user.id}
  `;
  const existing = rows[0] as
    | { stripe_customer_id: string | null; stripe_subscription_id: string | null }
    | undefined;

  if (enabled) {
    const customerId =
      existing?.stripe_customer_id ??
      (
        await stripe.customers.create({
          email: session.user.email,
          name: session.user.name,
          metadata: { userId: session.user.id },
        })
      ).id;

    const paymentMethod = await stripe.paymentMethods.attach("pm_card_visa", {
      customer: customerId,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PREMIUM_PRICE_ID }],
      default_payment_method: paymentMethod.id,
      metadata: { userId: session.user.id },
    });

    await sql`
      update public.profils_utilisateurs
      set
        est_premium = true,
        stripe_customer_id = ${customerId},
        stripe_subscription_id = ${subscription.id},
        modifie_le = now()
      where id = ${session.user.id}
    `;
  } else {
    if (existing?.stripe_subscription_id) {
      await stripe.subscriptions.cancel(existing.stripe_subscription_id).catch(() => {});
    }
    await sql`
      update public.profils_utilisateurs
      set est_premium = false, stripe_subscription_id = null, modifie_le = now()
      where id = ${session.user.id}
    `;
  }

  revalidatePath("/profil");
  return { success: true };
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
