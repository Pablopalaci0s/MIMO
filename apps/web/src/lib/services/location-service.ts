import { prisma } from "@mimo/database";
import type { MunicipalityDTO } from "@mimo/types";

export async function listMunicipalities(): Promise<MunicipalityDTO[]> {
  const municipalities = await prisma.municipality.findMany({
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    include: { department: true },
  });

  return municipalities.map((municipality) => ({
    id: municipality.id,
    name: `${municipality.name} — ${municipality.department.name}`,
    slug: municipality.slug,
    departmentId: municipality.departmentId,
  }));
}
