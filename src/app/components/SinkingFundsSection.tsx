"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  allocateToFund, 
  allocateGeneralToFunds,
  releaseFromFund, 
  executeFundExpense, 
  updateSinkingFund, 
  deleteSinkingFund 
} from "../actions/sinkingFund";
import { formatDateToInput, formatDateDisplay } from "@/lib/date";

type Wallet = { id: string; name: string; balance: number };
type SinkingFund = {
  id: string;
  name: string;
  targetAmount: number;
  frequencyDays: number;
  nextDueDate: Date;
  accumulatedAmount: number;
  isOneOff?: boolean;
  isCompleted?: boolean;
};

type ProvisionPeriod = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
const PROVISION_PERIOD_STORAGE_KEY = "finanzas_sinking_funds_provision_period";
const VALID_PROVISION_PERIODS: ProvisionPeriod[] = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"];

// Clasificación de ciclos
function getCycleCategory(days: number): "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "OTHER" {
  if (days <= 7) return "WEEKLY";
  if (days <= 15) return "BIWEEKLY";
  if (days <= 31) return "MONTHLY";
  return "OTHER";
}

function getCycleBadgeText(days: number): string {
  if (days === 7) return "Semanal (7d)";
  if (days <= 7) return `Cada ${days} días`;
  if (days === 14 || days === 15) return "Quincenal (15d)";
  if (days <= 15) return `Cada ${days} días`;
  if (days === 30 || days === 31) return "Mensual (30d)";
  if (days <= 31) return `Cada ${days} días`;
  if (days === 60) return "Bimestral (60d)";
  if (days === 365) return "Anual (365d)";
  return `Cada ${days} días`;
}

// Formateo de fecha determinista en la zona horaria de Mazatlán
function formatDate(d: Date | string): string {
  return formatDateDisplay(d);
}

function calculateFundQuota(fund: SinkingFund, multiplier: number): number {
  if (!fund.isOneOff) {
    // Para apartados recurrentes: flujo continuo según periodicidad (gasto por día * multiplicador del periodo)
    const dailyRate = fund.targetAmount / Math.max(1, fund.frequencyDays);
    return Math.ceil(dailyRate * multiplier);
  }

  // Para metas a futuro (gasto único): no superar lo que falta para completar la meta
  const nextDue = new Date(fund.nextDueDate);
  const daysLeft = Math.max(1, Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const remaining = Math.max(0, fund.targetAmount - fund.accumulatedAmount);
  const daily = remaining / daysLeft;
  
  return Math.ceil(Math.min(remaining, daily * multiplier));
}

function calculateFundRemainingForPeriod(fund: SinkingFund, multiplier: number): number {
  const quota = calculateFundQuota(fund, multiplier);
  if (!fund.isOneOff) {
    return Math.max(0, quota - fund.accumulatedAmount);
  }
  return quota;
}

const calculateFundSuggested = calculateFundQuota;

export default function SinkingFundsSection({
  sinkingFunds,
  wallets,
}: {
  sinkingFunds: SinkingFund[];
  wallets: Wallet[];
}) {
  // Pestaña principal: Todos, Solo Apartados Recurrentes, Solo Metas a Futuro
  const [mainView, setMainView] = useState<"ALL" | "RECURRING" | "GOALS">("ALL");
  
  // Filtro de ciclo para recurrentes
  const [cycleFilter, setCycleFilter] = useState<"ALL" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "OTHER">("ALL");

  // Preferencia de ritmo de ahorro (Diario, Semanal, Quincenal, Mensual) con persistencia en localStorage
  const [provisionPeriod, setProvisionPeriod] = useState<ProvisionPeriod>("WEEKLY");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROVISION_PERIOD_STORAGE_KEY) as ProvisionPeriod | null;
      if (saved && VALID_PROVISION_PERIODS.includes(saved)) {
        setProvisionPeriod(saved);
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, []);

  const handleProvisionPeriodChange = (period: ProvisionPeriod) => {
    setProvisionPeriod(period);
    try {
      localStorage.setItem(PROVISION_PERIOD_STORAGE_KEY, period);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  // Modales
  const [allocateModalFund, setAllocateModalFund] = useState<SinkingFund | null>(null);
  const [expenseModalFund, setExpenseModalFund] = useState<SinkingFund | null>(null);
  const [editModalFund, setEditModalFund] = useState<SinkingFund | null>(null);
  const [showGeneralModal, setShowGeneralModal] = useState(false);

  // Estado para el modal de distribución general
  const [generalLumpSum, setGeneralLumpSum] = useState<number>(0);
  const [generalAllocations, setGeneralAllocations] = useState<Record<string, number>>({});
  const [generalSelectedIds, setGeneralSelectedIds] = useState<Set<string>>(new Set());
  const [distributionStrategy, setDistributionStrategy] = useState<"URGENCY" | "SUGGESTED" | "PROPORTIONAL">("URGENCY");
  const [generalLoading, setGeneralLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  // Multiplicador de días según el periodo elegido
  const multiplier = provisionPeriod === "DAILY" ? 1 : provisionPeriod === "WEEKLY" ? 7 : provisionPeriod === "BIWEEKLY" ? 15 : 30;
  const periodLabel = provisionPeriod === "DAILY" ? "por día" : provisionPeriod === "WEEKLY" ? "por semana" : provisionPeriod === "BIWEEKLY" ? "por quincena" : "por mes";

  // Separar fondos recurrentes y metas a futuro
  const recurringFunds = useMemo(() => sinkingFunds.filter((f) => !f.isOneOff), [sinkingFunds]);
  const goalFunds = useMemo(() => sinkingFunds.filter((f) => f.isOneOff), [sinkingFunds]);

  // Agrupación por ciclo de apartados recurrentes
  const groupedRecurring = useMemo(() => {
    return {
      WEEKLY: recurringFunds.filter((f) => getCycleCategory(f.frequencyDays) === "WEEKLY"),
      BIWEEKLY: recurringFunds.filter((f) => getCycleCategory(f.frequencyDays) === "BIWEEKLY"),
      MONTHLY: recurringFunds.filter((f) => getCycleCategory(f.frequencyDays) === "MONTHLY"),
      OTHER: recurringFunds.filter((f) => getCycleCategory(f.frequencyDays) === "OTHER"),
    };
  }, [recurringFunds]);

  // Total acumulado general
  const totalAccumulatedInFunds = sinkingFunds.reduce((acc, f) => acc + f.accumulatedAmount, 0);
  const totalAccumulatedRecurring = recurringFunds.reduce((acc, f) => acc + f.accumulatedAmount, 0);
  const totalAccumulatedGoals = goalFunds.reduce((acc, f) => acc + f.accumulatedAmount, 0);

  // Provisión sugerida total (con redondeo hacia arriba en cada apartado)
  const totalSuggestedRecurring = recurringFunds.reduce((acc, f) => acc + calculateFundSuggested(f, multiplier), 0);
  const totalSuggestedGoals = goalFunds.reduce((acc, f) => acc + calculateFundSuggested(f, multiplier), 0);
  const totalSuggestedOverall = totalSuggestedRecurring + totalSuggestedGoals;

  // Lista de fondos ordenados por proximidad de vencimiento (el que vence antes va primero)
  const sortedFundsByUrgency = useMemo(() => {
    return [...sinkingFunds].sort(
      (a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    );
  }, [sinkingFunds]);

  // Estrategia 1: Prioridad por vencimiento más próximo (los que vencen antes reciben dinero primero)
  const applyUrgencyDistribution = (totalToDistribute: number) => {
    setGeneralLumpSum(totalToDistribute);
    setDistributionStrategy("URGENCY");
    const selected = sortedFundsByUrgency.filter((f) => generalSelectedIds.has(f.id));
    if (selected.length === 0 || totalToDistribute <= 0) {
      const emptyMap: Record<string, number> = {};
      sinkingFunds.forEach((f) => { emptyMap[f.id] = 0; });
      setGeneralAllocations(emptyMap);
      return;
    }

    const map: Record<string, number> = {};
    sinkingFunds.forEach((f) => { map[f.id] = 0; });

    let moneyLeft = totalToDistribute;

    // Llenar primero hasta cubrir la meta faltante de los que vencen antes
    for (const fund of selected) {
      if (moneyLeft <= 0) break;
      const needed = Math.max(0, fund.targetAmount - fund.accumulatedAmount);
      if (needed <= 0) continue;
      const alloc = Math.min(moneyLeft, needed);
      map[fund.id] = Math.ceil(alloc);
      moneyLeft -= alloc;
    }

    // Si aún queda dinero después de llenar todas las metas, asignarlo al más próximo
    if (moneyLeft > 0 && selected.length > 0) {
      map[selected[0].id] = (map[selected[0].id] || 0) + Math.ceil(moneyLeft);
    }

    setGeneralAllocations(map);
  };

  // Estrategia 2: Recalcular distribución según cuotas sugeridas para todos
  const applySuggestedToGeneral = () => {
    setDistributionStrategy("SUGGESTED");
    const map: Record<string, number> = {};
    let sum = 0;
    sinkingFunds.forEach((f) => {
      if (generalSelectedIds.has(f.id)) {
        const val = calculateFundRemainingForPeriod(f, multiplier);
        map[f.id] = val;
        sum += val;
      } else {
        map[f.id] = 0;
      }
    });
    setGeneralAllocations(map);
    setGeneralLumpSum(sum);
  };

  // Estrategia 3: Distribuir el monto ingresado de manera proporcional a lo faltante
  const applyProportionalLumpSum = (totalToDistribute: number) => {
    setGeneralLumpSum(totalToDistribute);
    setDistributionStrategy("PROPORTIONAL");
    const selected = sinkingFunds.filter((f) => generalSelectedIds.has(f.id));
    if (selected.length === 0 || totalToDistribute <= 0) {
      const emptyMap: Record<string, number> = {};
      sinkingFunds.forEach((f) => { emptyMap[f.id] = 0; });
      setGeneralAllocations(emptyMap);
      return;
    }

    const totalWeights = selected.reduce((sum, f) => sum + calculateFundSuggested(f, multiplier), 0);
    const map: Record<string, number> = {};

    let distributed = 0;
    selected.forEach((f, idx) => {
      if (idx === selected.length - 1) {
        map[f.id] = Math.max(0, Math.round((totalToDistribute - distributed) * 100) / 100);
      } else {
        const weight = totalWeights > 0 ? calculateFundSuggested(f, multiplier) / totalWeights : 1 / selected.length;
        const val = Math.ceil(totalToDistribute * weight);
        map[f.id] = val;
        distributed += val;
      }
    });

    sinkingFunds.forEach((f) => {
      if (!generalSelectedIds.has(f.id)) {
        map[f.id] = 0;
      }
    });

    setGeneralAllocations(map);
  };

  // Inicializar el modal de Apartado General
  const openGeneralModal = () => {
    const initialSelected = new Set(sinkingFunds.map((f) => f.id));
    setGeneralSelectedIds(initialSelected);

    // Por defecto, sugerir la cuota periódica global y priorizar por vencimiento
    const defaultAmount = totalSuggestedOverall || 500;
    setGeneralLumpSum(defaultAmount);
    setDistributionStrategy("URGENCY");

    // Aplicar distribución por vencimiento próximo al abrir
    const selected = [...sinkingFunds].sort(
      (a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    );

    const map: Record<string, number> = {};
    sinkingFunds.forEach((f) => { map[f.id] = 0; });

    let moneyLeft = defaultAmount;
    for (const fund of selected) {
      if (moneyLeft <= 0) break;
      const needed = Math.max(0, fund.targetAmount - fund.accumulatedAmount);
      if (needed <= 0) continue;
      const alloc = Math.min(moneyLeft, needed);
      map[fund.id] = Math.ceil(alloc);
      moneyLeft -= alloc;
    }
    if (moneyLeft > 0 && selected.length > 0) {
      map[selected[0].id] = (map[selected[0].id] || 0) + Math.ceil(moneyLeft);
    }

    setGeneralAllocations(map);
    setShowGeneralModal(true);
  };

  // Ejecutar el guardado de la distribución general
  const handleConfirmGeneralAllocation = async () => {
    const allocations = Object.entries(generalAllocations)
      .filter(([id, amount]) => generalSelectedIds.has(id) && amount > 0)
      .map(([id, amount]) => ({ fundId: id, amount }));

    if (allocations.length === 0) return;

    setGeneralLoading(true);
    try {
      await allocateGeneralToFunds(allocations);
      setShowGeneralModal(false);
    } catch (e) {
      console.error(e);
      alert("Error al distribuir el dinero");
    } finally {
      setGeneralLoading(false);
    }
  };

  // Componente interno para renderizar una tarjeta de apartado/meta
  const renderFundCard = (fund: SinkingFund) => {
    const nextDue = new Date(fund.nextDueDate);
    const daysLeft = Math.max(0, Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    
    // Cuota del periodo y monto restante por fondear
    const quota = calculateFundQuota(fund, multiplier);
    const remainingToFund = calculateFundRemainingForPeriod(fund, multiplier);
    const isCoveredForPeriod = remainingToFund === 0;
    const progressPercent = Math.min(100, Math.round((fund.accumulatedAmount / fund.targetAmount) * 100));

    return (
      <div
        key={fund.id}
        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow"
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">{fund.name}</h3>
                {fund.isOneOff ? (
                  <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                     Meta Futura
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                    {getCycleBadgeText(fund.frequencyDays)}
                  </span>
                )}
              </div>
              {fund.isOneOff && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Objetivo a alcanzar en ~{daysLeft} días
                </p>
              )}
            </div>
            <button
              onClick={() => setEditModalFund(fund)}
              title="Editar apartado"
              className="text-slate-300 hover:text-slate-600 transition-colors text-sm p-1 rounded-lg hover:bg-slate-50"
            >
              ️
            </button>
          </div>

          {/* Monto objetivo y sugerencia redondeada */}
          <div className="my-3 flex justify-between items-baseline gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Apartado actual</p>
              <p className="text-2xl font-black text-slate-900">
                ${fund.accumulatedAmount.toFixed(2)}{" "}
                <span className="text-xs font-medium text-slate-400">de ${fund.targetAmount.toFixed(2)}</span>
              </p>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[11px] font-semibold text-slate-400">
                Cuota: ${quota} {periodLabel}
              </span>
              <div className="mt-1">
                {isCoveredForPeriod ? (
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block">
                    ✓ Cubierto
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                    Faltan ${remainingToFund}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Barra de progreso visual */}
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100 
                  ? "bg-emerald-500" 
                  : fund.isOneOff 
                  ? "bg-amber-500" 
                  : "bg-teal-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-4">
            <span>{progressPercent}% fondeado</span>
            <span suppressHydrationWarning>
              {fund.isOneOff ? "Fecha objetivo: " : "Próximo gasto: "}
              {formatDate(nextDue)} (~{daysLeft}d)
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
          <button
            onClick={() => setAllocateModalFund(fund)}
            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95"
          >
            + Apartar Dinero
          </button>
          <button
            onClick={() => setExpenseModalFund(fund)}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
          >
            {fund.isOneOff ? " Cumplir Meta" : " Pagar Gasto"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-10">
      {/* 1. Selector de Pestaña Principal (Todos / Apartados Recurrentes / Metas a Futuro) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setMainView("ALL")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mainView === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ver Todo ({sinkingFunds.length})
          </button>
          <button
            onClick={() => setMainView("RECURRING")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 ${
              mainView === "RECURRING"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
             Apartados Recurrentes ({recurringFunds.length})
          </button>
          <button
            onClick={() => setMainView("GOALS")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 ${
              mainView === "GOALS"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
             Metas a Futuro ({goalFunds.length})
          </button>
        </div>

        {/* Selector de ritmo de ahorro global */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-xs self-stretch sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase px-2 hidden sm:inline">Ritmo:</span>
          {[
            { id: "DAILY" as const, label: "Diario" },
            { id: "WEEKLY" as const, label: "Semanal" },
            { id: "BIWEEKLY" as const, label: "Quincenal" },
            { id: "MONTHLY" as const, label: "Mensual" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => handleProvisionPeriodChange(p.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                provisionPeriod === p.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Banner Inteligente de Cuota y Botón de Apartado General */}
      {sinkingFunds.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                {mainView === "GOALS"
                  ? "Ahorro recomendado para cumplir tus metas a tiempo"
                  : "Provisión recomendada para cubrir tus gastos recurrentes"}
              </span>
              <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Redondeo superior
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black mt-1 text-white">
              $
              {mainView === "GOALS"
                ? totalSuggestedGoals
                : mainView === "RECURRING"
                ? totalSuggestedRecurring
                : totalSuggestedOverall}{" "}
              <span className="text-base font-normal text-emerald-200">/ {periodLabel}</span>
            </p>
            <p className="text-xs text-emerald-200/80 mt-1">
              Total acumulado en apartados y metas: <strong className="text-white">${totalAccumulatedInFunds.toFixed(2)}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={openGeneralModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-5 rounded-2xl shadow-md transition-all active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2"
            >
               Apartado General / Distribuir Dinero
            </button>
          </div>
        </div>
      )}

      {/* 3. VISTA: APARTADOS RECURRENTES (Divididos por ciclos) */}
      {(mainView === "ALL" || mainView === "RECURRING") && (
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                 Apartados de Gastos Recurrentes
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {recurringFunds.length} activos
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Gastos fijos o cíclicos divididos según su periodicidad configurada.
              </p>
            </div>

            {/* Filtros de ciclo específicos para recurrentes */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-xs self-stretch sm:self-auto text-xs">
              <button
                onClick={() => setCycleFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cycleFilter === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos los Ciclos
              </button>
              <button
                onClick={() => setCycleFilter("WEEKLY")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cycleFilter === "WEEKLY" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semanales ({groupedRecurring.WEEKLY.length})
              </button>
              <button
                onClick={() => setCycleFilter("BIWEEKLY")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cycleFilter === "BIWEEKLY" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Quincenales ({groupedRecurring.BIWEEKLY.length})
              </button>
              <button
                onClick={() => setCycleFilter("MONTHLY")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cycleFilter === "MONTHLY" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mensuales ({groupedRecurring.MONTHLY.length})
              </button>
              {groupedRecurring.OTHER.length > 0 && (
                <button
                  onClick={() => setCycleFilter("OTHER")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    cycleFilter === "OTHER" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Otros ({groupedRecurring.OTHER.length})
                </button>
              )}
            </div>
          </div>

          {/* Renderizado agrupado por ciclo cuando el filtro es ALL */}
          {cycleFilter === "ALL" ? (
            <div className="space-y-6">
              {/* Sección Semanales */}
              {groupedRecurring.WEEKLY.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                       Ciclo Semanal (≤ 7 días) • {groupedRecurring.WEEKLY.length} apartados
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">
                      Suma sugerida: ${groupedRecurring.WEEKLY.reduce((acc, f) => acc + calculateFundSuggested(f, multiplier), 0)} {periodLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedRecurring.WEEKLY.map(renderFundCard)}
                  </div>
                </div>
              )}

              {/* Sección Quincenales */}
              {groupedRecurring.BIWEEKLY.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                       Ciclo Quincenal (8 a 15 días) • {groupedRecurring.BIWEEKLY.length} apartados
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">
                      Suma sugerida: ${groupedRecurring.BIWEEKLY.reduce((acc, f) => acc + calculateFundSuggested(f, multiplier), 0)} {periodLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedRecurring.BIWEEKLY.map(renderFundCard)}
                  </div>
                </div>
              )}

              {/* Sección Mensuales */}
              {groupedRecurring.MONTHLY.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                       Ciclo Mensual (16 a 31 días) • {groupedRecurring.MONTHLY.length} apartados
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">
                      Suma sugerida: ${groupedRecurring.MONTHLY.reduce((acc, f) => acc + calculateFundSuggested(f, multiplier), 0)} {periodLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedRecurring.MONTHLY.map(renderFundCard)}
                  </div>
                </div>
              )}

              {/* Sección Otros Plazos */}
              {groupedRecurring.OTHER.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                       Otros Plazos (&gt; 31 días) • {groupedRecurring.OTHER.length} apartados
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">
                      Suma sugerida: ${groupedRecurring.OTHER.reduce((acc, f) => acc + calculateFundSuggested(f, multiplier), 0)} {periodLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedRecurring.OTHER.map(renderFundCard)}
                  </div>
                </div>
              )}

              {recurringFunds.length === 0 && (
                <div className="p-8 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl">
                  <p className="text-base font-medium text-slate-700">No tienes apartados de reserva recurrentes.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Crea apartados para croquetas, gasolina, despensa o suscripciones usando "+ Nuevo Apartado".
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Vista filtrada por un ciclo específico */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedRecurring[cycleFilter].map(renderFundCard)}
              {groupedRecurring[cycleFilter].length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-2xl">
                  <p className="text-base font-medium text-slate-700">No hay apartados en este ciclo.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. VISTA: METAS A FUTURO (Ahorro / Gastos Únicos) */}
      {(mainView === "ALL" || mainView === "GOALS") && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                 Metas de Ahorro y Gastos a Futuro
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {goalFunds.length} metas
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Objetivos con fecha límite para compras grandes, viajes, imprevistos o fondo de emergencia.
              </p>
            </div>
            {goalFunds.length > 0 && (
              <div className="text-xs text-slate-500 font-medium">
                Total acumulado en metas: <strong className="text-amber-700 font-bold">${totalAccumulatedGoals.toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalFunds.map(renderFundCard)}

            {goalFunds.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl">
                <p className="text-base font-medium text-amber-900">No tienes metas a futuro registradas.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Usa el botón "+ Nueva Meta" para fijar un objetivo de ahorro con fecha meta.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: APARTADO GENERAL / DISTRIBUIR DINERO */}
      {showGeneralModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                   Apartado General: Distribuir Dinero
                </h3>
                <p className="text-xs text-slate-500">
                  Prioriza los gastos más próximos a vencer o distribuye según tu estrategia.
                </p>
              </div>
              <button
                onClick={() => setShowGeneralModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Barra superior del monto general */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                      Monto General a Apartar ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={generalLumpSum || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (distributionStrategy === "SUGGESTED") {
                          applySuggestedToGeneral();
                        } else if (distributionStrategy === "PROPORTIONAL") {
                          applyProportionalLumpSum(val);
                        } else {
                          applyUrgencyDistribution(val);
                        }
                      }}
                      className="w-full sm:w-48 px-4 py-2.5 bg-white border border-gray-300 rounded-xl font-black text-slate-900 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => applyUrgencyDistribution(generalLumpSum || totalSuggestedOverall || 500)}
                      className={`flex-1 sm:flex-none font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 ${
                        distributionStrategy === "URGENCY"
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                       Priorizar por Vencimiento
                    </button>
                    <button
                      type="button"
                      onClick={applySuggestedToGeneral}
                      className={`flex-1 sm:flex-none font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 ${
                        distributionStrategy === "SUGGESTED"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                       Cuotas Sugeridas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyProportionalLumpSum(generalLumpSum || 500)}
                      className={`flex-1 sm:flex-none font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 ${
                        distributionStrategy === "PROPORTIONAL"
                          ? "bg-teal-700 text-white"
                          : "bg-white border border-gray-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>️</span> Proporcional
                    </button>
                  </div>
                </div>

                {distributionStrategy === "URGENCY" && (
                  <p className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5">
                    
                    <span>
                      <strong>Estrategia de Vencimiento:</strong> Se llena primero al 100% el apartado cuyo pago es más próximo para garantizar que quede cubierto a tiempo.
                    </span>
                  </p>
                )}
              </div>

              {/* Lista interactiva de apartados ordenada por urgencia de vencimiento */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Apartados (ordenados por el que vence primero):
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {generalSelectedIds.size} seleccionados
                  </span>
                </div>

                <div className="space-y-2 divide-y divide-gray-100 max-h-80 overflow-y-auto pr-1">
                  {sortedFundsByUrgency.map((fund, idx) => {
                    const isSelected = generalSelectedIds.has(fund.id);
                    const suggested = calculateFundSuggested(fund, multiplier);
                    const nextDue = new Date(fund.nextDueDate);
                    const daysLeft = Math.max(0, Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                    const remainingNeeded = Math.max(0, fund.targetAmount - fund.accumulatedAmount);

                    return (
                      <div
                        key={fund.id}
                        className={`pt-2.5 pb-1 flex items-center justify-between gap-3 transition-opacity ${
                          !isSelected ? "opacity-35" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(generalSelectedIds);
                              if (e.target.checked) {
                                next.add(fund.id);
                              } else {
                                next.delete(fund.id);
                              }
                              setGeneralSelectedIds(next);
                            }}
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                              <p className="text-sm font-bold text-slate-800 truncate">{fund.name}</p>
                              <span
                                suppressHydrationWarning
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  daysLeft <= 5
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : daysLeft <= 14
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {daysLeft === 0 ? "¡Vence hoy!" : `Vence en ~${daysLeft}d`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Lleva ${fund.accumulatedAmount.toFixed(2)} de ${fund.targetAmount.toFixed(2)}{" "}
                              {remainingNeeded > 0 ? (
                                <span>(falta: <strong className="text-slate-700">${remainingNeeded.toFixed(2)}</strong>)</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">✓ 100% cubierto</span>
                              )}
                              {" "}• Sugerido: <strong className="text-emerald-700">${suggested}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-medium">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={!isSelected}
                            value={generalAllocations[fund.id] ?? ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setGeneralAllocations((prev) => {
                                const next = { ...prev, [fund.id]: val };
                                const newSum = Object.entries(next)
                                  .filter(([id]) => generalSelectedIds.has(id))
                                  .reduce((acc, [, v]) => acc + v, 0);
                                setGeneralLumpSum(newSum);
                                return next;
                              });
                            }}
                            className="w-28 px-3 py-1.5 border border-gray-300 rounded-xl font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen final */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">Total a distribuir hoy:</span>
                  <span className="text-[11px] text-emerald-700">
                    {distributionStrategy === "URGENCY" 
                      ? " Prioridad por vencimiento más próximo activa"
                      : distributionStrategy === "SUGGESTED"
                      ? " Cuotas sugeridas del periodo"
                      : "️ Reparto proporcional"}
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-800">
                  $
                  {Object.entries(generalAllocations)
                    .filter(([id]) => generalSelectedIds.has(id))
                    .reduce((acc, [, val]) => acc + (val || 0), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowGeneralModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-bold text-slate-700 text-sm hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={generalLoading || generalSelectedIds.size === 0}
                onClick={handleConfirmGeneralAllocation}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {generalLoading ? "Guardando..." : "Confirmar y Apartar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APARTAR DINERO INDIVIDUAL */}
      {allocateModalFund && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Apartar Dinero</h3>
                <p className="text-xs text-slate-500">{allocateModalFund.name}</p>
              </div>
              <button
                onClick={() => setAllocateModalFund(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1">✕</button>
            </div>
            <form
              action={async (formData) => {
                setLoading(true);
                await allocateToFund(formData);
                setLoading(false);
                setAllocateModalFund(null);
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="fundId" value={allocateModalFund.id} />

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900">
                <p>
                  Meta: <strong>${allocateModalFund.targetAmount.toFixed(2)}</strong> • Llevas apartado:{" "}
                  <strong>${allocateModalFund.accumulatedAmount.toFixed(2)}</strong>
                </p>
                <p className="mt-1">
                  Falta para completar:{" "}
                  <strong>
                    ${Math.max(0, allocateModalFund.targetAmount - allocateModalFund.accumulatedAmount).toFixed(2)}
                  </strong>
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    ¿Cuánto dinero deseas apartar hoy? ($)
                  </label>
                  <span className="text-xs font-bold text-emerald-700">
                    Sugerido: ${calculateFundRemainingForPeriod(allocateModalFund, multiplier) || calculateFundQuota(allocateModalFund, multiplier)}
                  </span>
                </div>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={calculateFundRemainingForPeriod(allocateModalFund, multiplier) || calculateFundQuota(allocateModalFund, multiplier) || 100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Este dinero se compromete para este fondo y se resta de tu liquidez libre.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white px-8 py-4 mt-2 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {loading ? "Guardando..." : "Guardar en este Apartado"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAGAR / REALIZAR GASTO O CUMPLIR META */}
      {expenseModalFund && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {expenseModalFund.isOneOff ? "Registrar Compra de Meta" : "Registrar Compra / Pago"}
                </h3>
                <p className="text-xs text-slate-500">{expenseModalFund.name}</p>
              </div>
              <button
                onClick={() => setExpenseModalFund(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1">✕</button>
            </div>
            <form
              action={async (formData) => {
                setLoading(true);
                await executeFundExpense(formData);
                setLoading(false);
                setExpenseModalFund(null);
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="fundId" value={expenseModalFund.id} />

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                {expenseModalFund.isOneOff
                  ? "Al completar esta meta, se descontará el dinero de tu cuenta seleccionada, se registrará el gasto y la meta se marcará como completada."
                  : `Al registrar este pago, el dinero se descontará de la cuenta que elijas, se creará el movimiento de gasto en el historial, y la fecha del apartado se recorrerá automáticamente ${expenseModalFund.frequencyDays} días hacia el futuro.`}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ¿De qué cuenta se pagó?
                </label>
                <select
                  name="walletId"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (${w.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monto final pagado ($)
                </label>
                <input
                  type="number"
                  name="expenseAmount"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={expenseModalFund.targetAmount}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading || wallets.length === 0}
                className="w-full bg-slate-900 text-white px-8 py-4 mt-2 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {loading ? "Procesando..." : "Confirmar Pago"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR APARTADO O META */}
      {editModalFund && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Editar</h3>
                <p className="text-xs text-slate-500">{editModalFund.name}</p>
              </div>
              <button
                onClick={() => setEditModalFund(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <form
                action={async (formData) => {
                  setLoading(true);
                  await updateSinkingFund(formData);
                  setLoading(false);
                  setEditModalFund(null);
                }}
                className="space-y-4"
              >
                <input type="hidden" name="fundId" value={editModalFund.id} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editModalFund.name}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monto Objetivo ($)</label>
                    <input
                      type="number"
                      name="targetAmount"
                      step="0.01"
                      required
                      defaultValue={editModalFund.targetAmount}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {editModalFund.isOneOff ? "Plazo en días" : "Ciclo en días"}
                    </label>
                    <input
                      type="number"
                      name="frequencyDays"
                      min="1"
                      required
                      defaultValue={editModalFund.frequencyDays}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {editModalFund.isOneOff ? "Fecha Objetivo" : "Próxima Fecha de Pago"}
                    </label>
                    <input
                      type="date"
                      name="nextDueDate"
                      required
                      defaultValue={formatDateToInput(editModalFund.nextDueDate)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Apartado ($)</label>
                    <input
                      type="number"
                      name="accumulatedAmount"
                      step="0.01"
                      defaultValue={editModalFund.accumulatedAmount}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-95 text-sm"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </form>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <form
                  action={async (formData) => {
                    if (confirm(`¿Eliminar "${editModalFund.name}"?`)) {
                      setLoading(true);
                      await deleteSinkingFund(formData);
                      setLoading(false);
                      setEditModalFund(null);
                    }
                  }}
                >
                  <input type="hidden" name="fundId" value={editModalFund.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
