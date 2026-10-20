import { prisma } from "@/lib/prisma";

export async function authenticateApiRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (!authHeader) {
    return {
      error: "Falta encabezado de autorización (Authorization: Bearer <TOKEN> o x-api-key: <TOKEN>)",
      status: 401,
    };
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return { error: "Token vacío o no proporcionado", status: 401 };
  }

  // 1. Buscar directamente al usuario dueño del token
  let user = await prisma.user.findFirst({
    where: { apiToken: token },
  });

  // 2. Retrocompatibilidad con clave global en .env
  if (!user) {
    const configuredKey = process.env.SHORTCUTS_API_KEY || process.env.API_SECRET_KEY;
    if (configuredKey && token === configuredKey) {
      const targetUsername = process.env.SHORTCUTS_DEFAULT_USER || "efren";
      user = await prisma.user.findFirst({
        where: {
          username: { equals: targetUsername, mode: "insensitive" },
        },
      });

      if (!user) {
        user = await prisma.user.findFirst({
          orderBy: { createdAt: "asc" },
        });
      }
    }
  }

  if (!user) {
    return {
      error: "Token de API inválido o no reconocido. Verifica el token en tu perfil.",
      status: 403,
    };
  }

  return { user };
}
