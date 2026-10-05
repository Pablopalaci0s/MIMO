/**
 * Respuesta para entregar un documento sensible: nunca se cachea (ni en el
 * navegador compartido ni en un proxy) y el navegador no puede reinterpretar
 * el tipo. El tipo con el que se sirve sale de la detección por contenido que
 * se hizo al subir el archivo (`detectFileKind`), no de lo que declaró quien
 * lo subió. (La CSP la pone el sitio entero en `next.config.ts`: una CSP
 * puesta acá se pisaría.)
 */
export function documentResponse(file: { data: Buffer; mimeType: string }): Response {
  // Un PDF se descarga en vez de abrirse en el visor del navegador; una
  // imagen se muestra inline.
  const isPdf = file.mimeType === "application/pdf";
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.data.length),
      "Content-Disposition": isPdf ? 'attachment; filename="documento.pdf"' : "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
