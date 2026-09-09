import { LegalPageHeader } from "@/components/legal-page-header";

export const metadata = { title: "Mentions légales | PoketSecret" };

export default function MentionsLegalesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LegalPageHeader title="Mentions légales" />

      <div className="flex flex-col gap-6 p-4 text-sm">
        <div className="bg-muted rounded-md p-3">
          <p className="text-muted-foreground text-xs">
            Modèle à faire relire par un professionnel avant mise en ligne publique,
            notamment les champs signalés [À COMPLÉTER]. Ce texte ne constitue pas un
            conseil juridique.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Éditeur du site</h2>
          <p className="text-muted-foreground leading-relaxed">
            PoketSecret, activité individuelle d&apos;édition d&apos;une application
            communautaire de suivi de disponibilité de produits TCG Pokémon en magasin.
            <br />
            Le directeur de la publication est la même personne.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Hébergement</h2>
          <p className="text-muted-foreground leading-relaxed">
            Le site est hébergé par Vercel Inc. Coordonnées complètes disponibles sur{" "}
            vercel.com/legal.
            <br />
            La base de données est hébergée par Neon Inc. Coordonnées complètes
            disponibles sur neon.tech.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Données personnelles</h2>
          <p className="text-muted-foreground leading-relaxed">
            PoketSecret collecte les données nécessaires au fonctionnement du service :
            email et pseudo (création de compte), position approximative si tu
            l&apos;autorises (recherche de magasins à proximité), et les informations que
            tu publies toi-même (annonces, photos). Le paiement de l&apos;abonnement
            Premium est traité par Stripe, qui ne transmet à PoketSecret aucune donnée
            bancaire.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Conformément au RGPD, tu peux demander l&apos;accès, la rectification ou la
            suppression de tes données, ou la suppression de ton compte directement depuis
            la page Profil. Pour toute autre demande : [À COMPLÉTER : email de contact].
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            Seuls des cookies strictement nécessaires au fonctionnement du service
            (connexion, session) sont utilisés. Aucun cookie publicitaire ou de suivi
            tiers.
          </p>
        </section>
      </div>
    </div>
  );
}
