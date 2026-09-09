import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PoketSecret",
    short_name: "PoketSecret",
    description: "Suivi de la disponibilité des produits TCG Pokémon en magasin",
    start_url: "/",
    // "standalone" : lancée depuis l'écran d'accueil, l'app s'ouvre sans la barre
    // d'adresse Safari, comme une vraie app plutôt qu'un onglet de navigateur.
    display: "standalone",
    // Hex plutôt que hsl() : certains parsers de manifest/outils PWA n'acceptent que ça.
    // Équivalent de --background (hsl(220 20% 8%)) dans globals.css.
    background_color: "#101318",
    theme_color: "#101318",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
