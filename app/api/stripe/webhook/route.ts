import { revalidatePath } from "next/cache";
import type Stripe from "stripe";

import { sql } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * Source de vérité pour le statut Premium : contrairement au retour sur /profil après
 * paiement (qui ne voit que le tout premier succès), ce webhook capte aussi les
 * événements qui arrivent après coup (renouvellement, échec de paiement, annulation
 * depuis le portail Stripe) pour garder `est_premium` synchronisé dans le temps.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Signature manquante.", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    return new Response(`Signature invalide : ${(error as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.status === "complete") {
        await sql`
          update public.profils_utilisateurs
          set
            est_premium = true,
            stripe_customer_id = ${session.customer as string},
            stripe_subscription_id = ${session.subscription as string},
            modifie_le = now()
          where id = ${userId}
        `;
        revalidatePath("/profil");
      }
      break;
    }

    // Renouvellement/annulation/échec de paiement débouchent tous, tôt ou tard, sur un
    // changement de statut ici, pas besoin d'écouter invoice.payment_failed séparément.
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      await sql`
        update public.profils_utilisateurs
        set est_premium = ${isActive}, modifie_le = now()
        where stripe_subscription_id = ${subscription.id}
      `;
      revalidatePath("/profil");
      break;
    }

    default:
      break;
  }

  return new Response("OK", { status: 200 });
}
