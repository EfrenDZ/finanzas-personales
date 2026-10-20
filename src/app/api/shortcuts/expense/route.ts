import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput } from "@/lib/date";
import { authenticateApiRequest } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateApiRequest(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }
    const { user } = authResult;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "El cuerpo de la petición debe ser un JSON válido" },
        { status: 400 }
      );
    }

    // Admite campos tanto en español como en inglés
    const rawAmount = body.amount ?? body.monto;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto ('amount' o 'monto') es requerido y debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const description = (
      body.description ??
      body.descripcion ??
      body.concepto ??
      "Gasto rápido"
    )
      .toString()
      .trim();

    const walletQuery = (
      body.wallet ??
      body.cuenta ??
      body.walletName ??
      body.walletId
    )
      ?.toString()
      .trim();

    const categoryQuery = (
      body.category ??
      body.categoria ??
      body.categoryName ??
      body.categoryId
    )
      ?.toString()
      .trim();

    const rawDate = body.date ?? body.fecha;
    const txDate = rawDate ? parseDateInput(String(rawDate)) : new Date();

    // 1. Obtener la cuenta (wallet)
    let wallet = null;
    if (walletQuery) {
      wallet = await prisma.wallet.findFirst({
        where: {
          userId: user.id,
          OR: [
            { id: walletQuery },
            { name: { equals: walletQuery, mode: "insensitive" } },
          ],
        },
      });

      if (!wallet) {
        const available = await prisma.wallet.findMany({
          where: { userId: user.id },
          select: { name: true },
        });
        const names = available.map((w) => w.name).join(", ");
        return NextResponse.json(
          {
            success: false,
            error: `Cuenta '${walletQuery}' no encontrada. Cuentas disponibles: ${names || "ninguna"}`,
          },
          { status: 400 }
        );
      }
    } else {
      // Default a la primera cuenta registrada
      wallet = await prisma.wallet.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      if (!wallet) {
        return NextResponse.json(
          { success: false, error: "No tienes ninguna cuenta o billetera registrada en el sistema" },
          { status: 400 }
        );
      }
    }

    // 2. Resolver o auto-crear categoría
    let categoryId: string | null = null;
    let categoryName: string | null = null;

    if (categoryQuery) {
      let category = await prisma.category.findFirst({
        where: {
          userId: user.id,
          type: "EXPENSE",
          OR: [
            { id: categoryQuery },
            { name: { equals: categoryQuery, mode: "insensitive" } },
          ],
        },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            userId: user.id,
            name: categoryQuery,
            type: "EXPENSE",
          },
        });
      }
      categoryId = category.id;
      categoryName = category.name;
    }

    // 3. Registrar gasto y actualizar saldo atómicamente
    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          categoryId,
          type: "EXPENSE",
          amount: -Math.abs(amount),
          description,
          date: txDate,
        },
      });

      return { updatedWallet, transaction };
    });

    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: `Gasto de $${amount.toFixed(2)} registrado en '${wallet.name}'`,
      data: {
        transactionId: result.transaction.id,
        amount,
        description,
        wallet: wallet.name,
        newBalance: result.updatedWallet.balance,
        category: categoryName,
        date: txDate.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error en POST /api/shortcuts/expense:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
