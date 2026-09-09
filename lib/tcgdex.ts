import type { SeriesExtensionPair } from "@/lib/product-options";

interface TcgdexSerieSummary {
  id: string;
  name: string;
}

interface TcgdexSerieDetail {
  name: string;
  logo?: string;
  sets: { name: string; logo?: string }[];
}

// TCGdex sert le logo sans extension : il faut suffixer le format pour obtenir une
// image exploitable (sinon 404).
function withImageFormat(url: string | undefined): string | undefined {
  return url ? `${url}.png` : undefined;
}

const BASE_URL = "https://api.tcgdex.net/v2/fr";
// Gratuit, sans clé, quasi statique (quelques extensions par an) : un jour de cache
// suffit largement et évite de refaire ~20 requêtes à chaque rendu de page.
const REVALIDATE_SECONDS = 60 * 60 * 24;

/** Référentiel série → extension utilisé pour proposer des options canoniques dans les
 *  formulaires d'ajout de produit, y compris pour une extension qui vient de sortir et
 *  qu'aucun contributeur n'a encore signalée en magasin. */
export async function fetchSeriesExtensions(): Promise<SeriesExtensionPair[]> {
  const seriesRes = await fetch(`${BASE_URL}/series`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!seriesRes.ok) throw new Error(`TCGdex error ${seriesRes.status}`);
  const seriesList = (await seriesRes.json()) as TcgdexSerieSummary[];

  const details = await Promise.all(
    seriesList.map((serie) =>
      fetch(`${BASE_URL}/series/${serie.id}`, { next: { revalidate: REVALIDATE_SECONDS } }).then(
        (r) => r.json() as Promise<TcgdexSerieDetail>
      )
    )
  );

  // TCGdex liste séries et extensions par ordre de sortie croissant : on inverse les
  // deux niveaux pour que le plus récent apparaisse en premier dans les menus déroulants.
  return [...details].reverse().flatMap((detail) =>
    [...detail.sets].reverse().map((set) => ({
      series: detail.name,
      setName: set.name,
      seriesLogoUrl: withImageFormat(detail.logo),
      setLogoUrl: withImageFormat(set.logo),
    }))
  );
}
