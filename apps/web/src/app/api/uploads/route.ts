import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { auth } from "@mimo/auth";
import { apiError, apiErrorFromException, apiSuccess } from "@/lib/api-response";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Guarda la imagen en disco local (apps/web/public/uploads) y devuelve su
 * URL pública — sin servicio de storage en la nube configurado todavía, ver
 * README "Almacenamiento de imágenes". Requiere sesión para evitar que
 * cualquiera use el servidor como hosting de archivos anónimo.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("UNAUTHORIZED", "No autenticado", 401);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError("INVALID_FILE", "No se envió ningún archivo.", 400);
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return apiError("INVALID_TYPE", "Solo se aceptan imágenes JPG, PNG o WEBP.", 400);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return apiError("FILE_TOO_LARGE", "La imagen no puede pesar más de 5MB.", 400);
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    return apiSuccess({ url: `/uploads/${filename}` }, 201);
  } catch (error) {
    return apiErrorFromException(error);
  }
}
