import { prisma } from "@/lib/prisma";

export async function authenticateApiRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (!authHeader) {
    return { error: "Falta encabezado de autorización (Authorization: Bearer <TOKEN> o x-api-key: <TOKEN>)", status: 401 };
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  const configuredKey = process.env.SHORTCUTS_API_KEY || process.env.API_SECRET_KEY;
  if (!configuredKey) {
    return { error: "SHORTCUTS_API_KEY no está configurado en el servidor (.env)", status: 500 };
  }

  if (token !== configuredKey) {
    return { error: "Token de API inválido", status: 403 };
  }

  // Identificar al usuario propietario
  const targetUsername = process.env.SHORTCUTS_DEFAULT_USER || "efren";
  let user = await prisma.user.findFirst({
    where: {
      username: { equals: targetUsername, mode: "insensitive" },
    },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });
  }

  if (!user) {
    return { error: "No se encontró ningún usuario registrado en la base de datos", status: 404 };
  }

  return { user };
}
