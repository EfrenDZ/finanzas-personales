"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createBudget(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const user = session.user as { id: string };
  const userId = user.id;
  let categoryId = (formData.get("categoryId") as string)?.trim();
  const newCategoryName = (formData.get("newCategoryName") as string)?.trim();
  const limitAmount = parseFloat(formData.get("limitAmount") as string);
  const frequencyDays = parseInt(formData.get("frequencyDays") as string, 10) || 7;
  const startDateStr = formData.get("startDate") as string;

  if (isNaN(limitAmount) || limitAmount <= 0) {
    throw new Error("Monto límite inválido");
  }

  // Si eligió crear una categoría nueva al vuelo
  if (!categoryId && newCategoryName) {
    let existingCat = await prisma.category.findFirst({
      where: {
        userId,
        name: { equals: newCategoryName, mode: "insensitive" },
        type: "EXPENSE",
      },
    });

    if (!existingCat) {
      existingCat = await prisma.category.create({
        data: {
          userId,
          name: newCategoryName,
          type: "EXPENSE",
        },
      });
    }

    categoryId = existingCat.id;
  }

  if (!categoryId) {
    throw new Error("Debes seleccionar o ingresar una categoría");
  }

  // Verificar si ya existe un presupuesto para esta categoría
  const existingBudget = await prisma.budget.findFirst({
    where: { userId, categoryId },
  });

  if (existingBudget) {
    throw new Error("Ya existe un tope de gasto para esta categoría. Puedes editarlo o eliminarlo.");
  }

  const startDate = startDateStr ? new Date(`${startDateStr}T12:00:00`) : new Date();

  await prisma.budget.create({
    data: {
      userId,
      categoryId,
      limitAmount,
      frequencyDays,
      startDate,
    },
  });

  revalidatePath("/");
  revalidatePath("/budgets");
}

export async function updateBudget(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const budgetId = formData.get("budgetId") as string;
  const limitAmount = parseFloat(formData.get("limitAmount") as string);
  const frequencyDays = parseInt(formData.get("frequencyDays") as string, 10);
  const resetCycle = formData.get("resetCycle") === "true";
  const startDateStr = formData.get("startDate") as string;

  if (!budgetId || isNaN(limitAmount) || limitAmount <= 0) {
    throw new Error("Datos inválidos");
  }

  const updateData: {
    limitAmount: number;
    frequencyDays: number;
    startDate?: Date;
  } = {
    limitAmount,
    frequencyDays: frequencyDays > 0 ? frequencyDays : 7,
  };

  if (resetCycle) {
    updateData.startDate = new Date();
  } else if (startDateStr) {
    updateData.startDate = new Date(`${startDateStr}T12:00:00`);
  }

  await prisma.budget.update({
    where: { id: budgetId },
    data: updateData,
  });

  revalidatePath("/");
  revalidatePath("/budgets");
}

export async function deleteBudget(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");

  const budgetId = formData.get("budgetId") as string;
  if (!budgetId) throw new Error("ID inválido");

  await prisma.budget.delete({
    where: { id: budgetId },
  });

  revalidatePath("/");
  revalidatePath("/budgets");
}
