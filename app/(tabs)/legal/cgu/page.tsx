import { LegalPageHeader } from "@/components/legal-page-header";

export const metadata = { title: "CGU | PoketSecret" };

export default function CguPage() {
  return (
    <div className="flex flex-1 flex-col">
      <LegalPageHeader title="Conditions Générales d'Utilisation" />

      <div className="flex flex-col gap-6 p-4 text-sm">
        <div className="bg-muted rounded-md p-3">
          <p className="text-muted-foreground text-xs">
            Modèle à faire relire par un professionnel avant mise en ligne publique. Ce
            texte ne constitue pas un conseil juridique.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">1. Objet</h2>
          <p className="text-muted-foreground leading-relaxed">
            PoketSecret est un service communautaire de suivi de disponibilité de
            produits TCG Pokémon en magasin. Les annonces (produit, prix, quantité,
            photo) sont publiées par les utilisateurs eux-mêmes, pas par PoketSecret, et
            modérées par la communauté via un système de vote pondéré par la réputation.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">2. Création de compte</h2>
          <p className="text-muted-foreground leading-relaxed">
            L&apos;utilisation de certaines fonctionnalités (publier une annonce, voter,
            suivre un produit ou un magasin) nécessite un compte. Tu es responsable de la
            confidentialité de ton mot de passe et de toute activité effectuée depuis ton
            compte.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">3. Contenu publié</h2>
          <p className="text-muted-foreground leading-relaxed">
            En publiant une annonce ou une photo, tu garantis qu&apos;elle correspond à
            une disponibilité réelle, vérifiée par toi, et que la photo a été prise par
            toi dans le magasin concerné. Tu conserves tes droits sur ce que tu publies,
            et tu accordes à PoketSecret le droit de l&apos;afficher dans le cadre du
            service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">4. Modération communautaire</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les annonces et les magasins peuvent être confirmés, contestés ou signalés
            par les autres utilisateurs. Le poids de chaque vote dépend de la réputation
            de son auteur, pour limiter l&apos;impact de faux comptes. Une annonce trop
            contestée ou signalée est masquée (mais reste votable) le temps que la
            communauté tranche. Le détail de ce fonctionnement est résumé dans la section
            « Aide et règles » de la page Profil.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">5. Comportements interdits</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sont notamment interdits : publier une fausse disponibilité, une photo qui
            n&apos;est pas la tienne, signaler ou contester de mauvaise foi, créer
            plusieurs comptes pour fausser les votes, ou utiliser le service à des fins
            illégales. PoketSecret se réserve le droit de suspendre ou supprimer un
            compte en cas d&apos;abus.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">6. Absence de garantie sur les annonces</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les informations affichées (prix, stock, disponibilité) proviennent des
            utilisateurs, pas des magasins eux-mêmes. PoketSecret ne garantit ni leur
            exactitude ni leur actualité et ne peut être tenu responsable d&apos;un
            déplacement en magasin sur la base d&apos;une annonce erronée.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">7. Résiliation</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tu peux supprimer ton compte à tout moment depuis la page Profil. PoketSecret
            peut suspendre ou supprimer un compte qui ne respecte pas ces conditions,
            après notification par email lorsque c&apos;est raisonnablement possible.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">8. Droit applicable</h2>
          <p className="text-muted-foreground leading-relaxed">
            Les présentes conditions sont soumises au droit français. En cas de litige,
            une solution amiable sera recherchée en priorité.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">9. Modification des CGU</h2>
          <p className="text-muted-foreground leading-relaxed">
            PoketSecret peut modifier ces conditions à tout moment. Les utilisateurs
            seront informés des changements significatifs. La poursuite de
            l&apos;utilisation du service après modification vaut acceptation.
          </p>
        </section>
      </div>
    </div>
  );
}
