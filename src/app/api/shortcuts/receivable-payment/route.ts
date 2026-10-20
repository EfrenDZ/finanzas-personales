import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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

    const debtorQuery = (
      body.debtorName ??
      body.debtor ??
      body.deudor ??
      body.receivableId ??
      body.receivable ??
      body.nombre
    )
      ?.toString()
      .trim();

    if (!debtorQuery) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre o ID del deudor ('debtorName' o 'deudor') es requerido",
        },
        { status: 400 }
      );
    }

    const rawAmount = body.amount ?? body.monto;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto ('amount' o 'monto') es requerido y debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const walletQuery = (
      body.wallet ??
      body.cuenta ??
      body.walletName ??
      body.walletId
    )
      ?.toString()
      .trim();

    const notes = (
      body.notes ??
      body.descripcion ??
      body.description ??
      body.concepto
    )
      ?.toString()
      .trim();

    // 1. Buscar la cuenta por cobrar
    const receivable = await prisma.receivable.findFirst({
      where: {
        userId: user.id,
        OR: [
          { id: debtorQuery },
          { debtorName: { equals: debtorQuery, mode: "insensitive" } },
          { debtorName: { contains: debtorQuery, mode: "insensitive" } },
        ],
      },
    });

    if (!receivable) {
      const activeReceivables = await prisma.receivable.findMany({
        where: { userId: user.id },
        select: { debtorName: true, currentBalance: true },
      });
      const names = activeReceivables
        .map((r) => `${r.debtorName} ($${r.currentBalance})`)
        .join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `Cuenta por cobrar '${debtorQuery}' no encontrada. Cuentas activas: ${names || "ninguna"}`,
        },
        { status: 400 }
      );
    }

    // 2. Buscar la billetera destino
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
        return NextResponse.json(
          { success: false, error: `Billetera '${walletQuery}' no encontrada` },
          { status: 400 }
        );
      }
    } else {
      wallet = await prisma.wallet.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      if (!wallet) {
        return NextResponse.json(
          { success: false, error: "No tienes ninguna billetera registrada para recibir el abono" },
          { status: 400 }
        );
      }
    }

    // 3. Registrar el abono de forma atómica
    const result = await prisma.$transaction(async (tx) => {
      const updatedReceivable = await tx.receivable.update({
        where: { id: receivable.id },
        data: {
          currentBalance: { decrement: amount },
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "INCOME",
          amount: Math.abs(amount),
          description: notes || `Abono recibido de ${receivable.debtorName}`,
        },
      });

      const receivableTx = await tx.receivableTransaction.create({
        data: {
          receivableId: receivable.id,
          walletId: wallet.id,
          amount,
          type: "PAYMENT",
          notes: notes || `Abono recibido`,
        },
      });

      return { updatedReceivable, updatedWallet, transaction, receivableTx };
    });

    revalidatePath("/");
    revalidatePath("/accounts");

    return NextResponse.json({
      success: true,
      message: `Abono de $${amount.toFixed(2)} registrado para '${receivable.debtorName}'. Saldo restante: $${result.updatedReceivable.currentBalance.toFixed(2)}`,
      data: {
        debtorName: receivable.debtorName,
        amountPaid: amount,
        remainingDebt: result.updatedReceivable.currentBalance,
        receivedInWallet: wallet.name,
        newWalletBalance: result.updatedWallet.balance,
      },
    });
  } catch (error: unknown) {
    console.error("Error en POST /api/shortcuts/receivable-payment:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
