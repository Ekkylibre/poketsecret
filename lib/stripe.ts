import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 9,99 €/mois, même montant que celui affiché sur /profil (PLAN_FEATURES).
export const PREMIUM_PRICE_EUR_CENTS = 999;

// Price Stripe réutilisable (mode test) pour créer un abonnement directement en API,
// sans passer par Checkout, utilisé par la simulation dev (voir devTogglePremium).
// Un Price ne peut pas s'inline avec product_data sur subscriptions.create (contrairement
// à checkout.sessions.create), donc on réutilise toujours le même ici plutôt que d'en
// recréer un à chaque simulation.
export const PREMIUM_PRICE_ID = "price_1UDT2eDgGHhqzO2Z1UvPAYce";
