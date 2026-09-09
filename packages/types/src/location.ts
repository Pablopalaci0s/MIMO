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
}
