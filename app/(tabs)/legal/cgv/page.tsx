import { LegalPageHeader } from "@/components/legal-page-header";

export const metadata = { title: "CGV | PoketSecret" };

export default function CgvPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LegalPageHeader title="Conditions Générales de Vente" />

      <div className="flex flex-col gap-6 p-4 text-sm">
        <div className="bg-muted rounded-md p-3">
          <p className="text-muted-foreground text-xs">
            Modèle à faire relire par un professionnel avant mise en ligne publique,
            notamment les champs signalés [À COMPLÉTER]. Le droit de la consommation
            impose des mentions précises (médiateur, rétractation) qui doivent être
            exactes avant tout encaissement réel. Ce texte ne constitue pas un conseil
            juridique.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">1. Objet</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ces conditions régissent la vente de l&apos;abonnement PoketSecret Premium :
            extensions et magasins suivis illimités, notifications en temps réel,
            épinglage d&apos;annonces.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">2. Prix et paiement</h2>
          <p className="text-muted-foreground leading-relaxed">
            L&apos;abonnement Premium est facturé 9,99 € TTC par mois, reconduit
            automatiquement chaque mois jusqu&apos;à résiliation. Le prix affiché sur la
            page Profil au moment de la souscription fait foi. Le paiement est traité par
            Stripe ; PoketSecret n&apos;a jamais accès à tes coordonnées bancaires.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">3. Droit de rétractation</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conformément à l&apos;article L221-28 du Code de la consommation, le droit de
            rétractation ne s&apos;applique pas à un contenu numérique fourni
            immédiatement après souscription lorsque le consommateur y a expressément
            renoncé. [À COMPLÉTER : si ce renoncement explicite n&apos;est pas
            recueilli au moment du paiement, le délai légal de rétractation de 14 jours
            s&apos;applique et doit être respecté].
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">4. Résiliation</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tu peux résilier ton abonnement à tout moment depuis le portail de
            facturation Stripe, accessible sur la page Profil. La résiliation prend effet
            à la fin de la période déjà payée : aucun remboursement au prorata
            n&apos;est effectué pour le mois en cours, sauf disposition légale
            contraire.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">5. Défaut de paiement</h2>
          <p className="text-muted-foreground leading-relaxed">
            En cas d&apos;échec de paiement lors du renouvellement, l&apos;accès aux
            fonctionnalités Premium peut être suspendu jusqu&apos;à régularisation.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">6. Réclamations et médiation</h2>
          <p className="text-muted-foreground leading-relaxed">
            Pour toute réclamation : [À COMPLÉTER : email de contact]. Conformément au
            Code de la consommation, en cas de litige non résolu, tu peux recourir
            gratuitement au médiateur de la consommation suivant : [À COMPLÉTER : nom et
            coordonnées du médiateur].
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">7. Droit applicable</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les présentes conditions sont soumises au droit français.
          </p>
        </section>
      </div>
    </div>
  );
}
