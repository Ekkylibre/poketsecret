// Test d'import : récupère les produits scellés les plus récents depuis
// pokemontcgapi.com et les insère dans public.produits (Neon).
//
// Usage :
//   node --env-file=.env.local scripts/import-sealed-products.mjs [limite]
//
// Nécessite POKEMON_TCG_API_KEY (voir pokemontcgapi.com/free-api-key) et
// DATABASE_URL dans .env.local.

import { neon } from "@neondatabase/serverless";

const apiKey = process.env.POKEMON_TCG_API_KEY;
if (!apiKey) {
  console.error("POKEMON_TCG_API_KEY manquant (ajoute-le dans .env.local).");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Table produits limitée à ces 4 valeurs (contrainte CHECK) — mapping approximatif
// des "kind" de l'API vers nos catégories existantes.
const KIND_TO_TYPE = {
  BOOSTER_BOX: "display",
  ETB: "coffret",
  TIN: "coffret",
  COLLECTION: "coffret",
  BLISTER: "booster",
};

const limit = Number(process.argv[2] ?? 20);

// orderBy=-release_date est déjà la valeur par défaut de l'API (les plus récents
// en premier) — explicite ici pour que ce soit clair sans relire leur doc.
const url = `https://api.pokemontcgapi.com/v1/sealed?lang=fr&orderBy=-release_date&limit=${limit}`;

const res = await fetch(url, { headers: { "X-Api-Key": apiKey } });
if (!res.ok) {
  console.error(`Erreur API ${res.status} :`, await res.text());
  process.exit(1);
}

const { data, meta } = await res.json();
console.log(`Reçu ${data.length} produits (catalogue total : ${meta.total_count}).\n`);

let inserted = 0;
for (const p of data) {
  const type = KIND_TO_TYPE[p.kind] ?? "autre";
  const rows = await sql`
    insert into public.produits (nom, type, extension, image_url)
    values (${p.name}, ${type}, ${p.set_name}, ${p.image_url})
    on conflict (type, extension, nom) do nothing
    returning id
  `;
  if (rows.length > 0) inserted++;
  console.log(`  [${p.release_date ?? "?"}] (${type}) ${p.name} — ${p.set_name}`);
}

console.log(`\n${inserted}/${data.length} nouvelle(s) ligne(s) insérée(s) dans public.produits.`);
