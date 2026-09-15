import { sql } from "@/lib/db";
import { fetchSeriesExtensions } from "@/lib/tcgdex";
import type { ProductType } from "@/lib/types";

// Mapping approximatif des "kind" de pokemontcgapi.com vers nos types (voir
// produits_type_check en base) : contrairement à scripts/import-sealed-products.mjs (test
// manuel dont cette route reprend la logique), BLISTER et TIN pointent ici directement
// vers nos catégories dédiées "blister"/"tin" plutôt que d'être noyés dans "booster"/
// "coffret", et ETB vers "coffret_dresseur_elite" plutôt qu'un "coffret" générique.
const KIND_TO_TYPE: Record<string, ProductType> = {
  BOOSTER_BOX: "display",
  ETB: "coffret_dresseur_elite",
  TIN: "tin",
  COLLECTION: "coffret",
  BLISTER: "blister",
};

const IMPORT_LIMIT = 50;

interface PokemonTcgApiSealedProduct {
  name: string;
  kind: string;
  set_name: string;
  image_url: string | null;
  release_date: string | null;
}

/**
 * Tâche planifiée (voir vercel.json) : complète automatiquement le catalogue
 * public.produits avec les nouveautés scellées de pokemontcgapi.com, pour ne plus
 * dépendre d'un contributeur qui les ajoute à la main via "Ajouter un produit" avant
 * qu'un magasin puisse les référencer.
 *
 * La "série" (Écarlate et Violet, etc.) n'existe pas dans cette réponse API, seulement
 * l'extension ("set_name") : on la résout via TCGdex (même référentiel que le formulaire
 * manuel, voir lib/tcgdex.ts) pour rester cohérent avec les produits créés à la main —
 * canFollowExtension et "suivre une extension" groupent par (serie, extension). Une
 * extension qu'on ne sait pas rattacher est ignorée plutôt qu'insérée avec une série
 * fausse ou vide (voir `nonResolus` dans la réponse pour un ajout manuel si besoin).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Non autorisé.", { status: 401 });
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "POKEMON_TCG_API_KEY manquant." }, { status: 500 });
  }

  const [sealedRes, seriesExtensions] = await Promise.all([
    fetch(
      `https://api.pokemontcgapi.com/v1/sealed?lang=fr&orderBy=-release_date&limit=${IMPORT_LIMIT}`,
      { headers: { "X-Api-Key": apiKey } }
    ),
    fetchSeriesExtensions(),
  ]);

  if (!sealedRes.ok) {
    return Response.json(
      { error: `Erreur pokemontcgapi.com ${sealedRes.status}`, detail: await sealedRes.text() },
      { status: 502 }
    );
  }

  const seriesBySetName = new Map(
    seriesExtensions.map((s) => [s.setName.trim().toLowerCase(), s.series])
  );

  const { data } = (await sealedRes.json()) as { data: PokemonTcgApiSealedProduct[] };

  let inserted = 0;
  const nonResolus: string[] = [];

  for (const p of data) {
    const serie = seriesBySetName.get(p.set_name.trim().toLowerCase());
    if (!serie) {
      nonResolus.push(p.set_name);
      continue;
    }

    const type = KIND_TO_TYPE[p.kind] ?? "autre";
    const rows = await sql`
      insert into public.produits (nom, type, serie, extension, image_url)
      values (${p.name}, ${type}, ${serie}, ${p.set_name}, ${p.image_url})
      on conflict (type, extension, nom) do nothing
      returning id
    `;
    if (rows.length > 0) inserted++;
  }

  return Response.json({ recus: data.length, inseres: inserted, nonResolus: [...new Set(nonResolus)] });
}
