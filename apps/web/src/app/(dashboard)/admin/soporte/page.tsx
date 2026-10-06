import { redirect } from "next/navigation";

/** La bandeja de soporte se mudó al centro de soporte (área propia, fuera de /admin). */
export default function AdminSupportRedirectPage() {
  redirect("/centro-soporte");
}
