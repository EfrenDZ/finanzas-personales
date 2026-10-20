"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function getUserApiToken(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiToken: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  if (user.apiToken) {
    return user.apiToken;
  }

  // Generar uno nuevo si no tenía
  const newToken = "fnz_" + crypto.randomBytes(16).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { apiToken: newToken },
  });

  return newToken;
}

export async function regenerateUserApiToken(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const userId = (session.user as { id: string }).id;
  const newToken = "fnz_" + crypto.randomBytes(16).toString("hex");

  await prisma.user.update({
    where: { id: userId },
    data: { apiToken: newToken },
  });

  return newToken;
}
