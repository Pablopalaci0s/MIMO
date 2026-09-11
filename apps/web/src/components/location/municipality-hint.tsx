import type { MunicipalityDTO } from "@mimo/types";

/** Texto informativo bajo un selector de municipio: qué antiguos municipios
 * (pre-reforma territorial 2021) quedaron agrupados ahí — ayuda a reconocer
 * el pueblo/colonia real sin agregar un nivel de selección más. */
export function MunicipalityHint({
  municipalities,
  municipalityId,
}: {
  municipalities: MunicipalityDTO[];
  municipalityId: string | null | undefined;
}) {
  const municipality = municipalities.find((m) => m.id === municipalityId);
  if (!municipality || municipality.districts.length === 0) return null;

  return <p className="text-xs text-neutral-400">Incluye: {municipality.districts.join(", ")}</p>;
}
