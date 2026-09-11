export interface DepartmentDTO {
  id: string;
  name: string;
  slug: string;
}

export interface MunicipalityDTO {
  id: string;
  name: string;
  slug: string;
  departmentId: string;
  /** Antiguos municipios (pre-reforma 2021) agrupados acá — solo informativo. */
  districts: string[];
}
