"use client";

import { useRef, useState, useEffect } from "react";
import { createSinkingFund } from "../actions/sinkingFund";
import { formatDateToInput } from "@/lib/date";

type Wallet = { id: string; name: string; balance: number };

export default function SinkingFundForm({ 
  onSuccess, 
  defaultIsOneOff = false,
  wallets = [],
}: { 
  onSuccess?: () => void;
  defaultIsOneOff?: boolean;
  wallets?: Wallet[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [targetAmount, setTargetAmount] = useState<string>("");
  const [frequencyDays, setFrequencyDays] = useState<string>("");
  const [nextDueDate, setNextDueDate] = useState<string>("");
  const [autoPay, setAutoPay] = useState(false);
  const [defaultWalletId, setDefaultWalletId] = useState("");

  const [isOneOff, setIsOneOff] = useState(defaultIsOneOff);

  // Actualizar la fecha sugerida automáticamente según los días
  useEffect(() => {
    const days = parseInt(frequencyDays, 10);
    if (days > 0) {
      const target = new Date(Date.now() + days * 86400000);
      setNextDueDate(formatDateToInput(target));
    } else {
      setNextDueDate("");
    }
  }, [frequencyDays]);

  const numTargetAmount = parseFloat(targetAmount) || 0;
  const numFrequencyDays = parseInt(frequencyDays, 10) || 0;
  const dailyCost = numFrequencyDays > 0 && numTargetAmount > 0 ? Math.ceil(numTargetAmount / numFrequencyDays) : 0;
  const weeklyCost = numFrequencyDays > 0 && numTargetAmount > 0 ? Math.ceil((numTargetAmount / numFrequencyDays) * 7) : 0;
  const monthlyCost = numFrequencyDays > 0 && numTargetAmount > 0 ? Math.ceil((numTargetAmount / numFrequencyDays) * 30) : 0;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setLoading(true);
        await createSinkingFund(formData);
        formRef.current?.reset();
        setLoading(false);
        onSuccess?.();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="isOneOff" value={isOneOff ? "true" : "false"} />

      {/* Modalidad: Recurrente vs Gasto Único */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Naturaleza del Gasto
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsOneOff(false)}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
              !isOneOff
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
             Recurrente
          </button>
          <button
            type="button"
            onClick={() => setIsOneOff(true)}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
              isOneOff
                ? "bg-amber-50 border-amber-500 text-amber-800 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
             Gasto Único / Imprevisto
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {isOneOff ? "Nombre del Gasto Imprevisto / Meta" : "Nombre del Gasto / Apartado"}
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder={isOneOff ? "Ej. Reparación de algo, Regalo.." : "Ej. Croquetas, Gasolina..."}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        />
      </div>

      {!isOneOff && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tipo de Ciclo
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50">
              <input type="radio" name="cycleType" value="STRICT" defaultChecked className="mt-1 text-emerald-600 focus:ring-emerald-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">Fijo / Estricto</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">Suscripciones, rentas. La fecha no cambia si pagas tarde.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50">
              <input type="radio" name="cycleType" value="ESTIMATED" className="mt-1 text-emerald-600 focus:ring-emerald-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">Estimado / Relleno</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">Croquetas. El ciclo se reinicia a partir del día en que compras.</p>
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Costo del gasto ($)
          </label>
          <input
            type="number"
            name="targetAmount"
            step="0.01"
            min="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {isOneOff ? "¿En cuántos días tendrás que pagarlo?" : "¿Cada cuántos días es este gasto?"}
          </label>
          <input
            type="number"
            name="frequencyDays"
            min="1"
            value={frequencyDays}
            onChange={(e) => setFrequencyDays(e.target.value)}
            required
            placeholder="Ej. 30"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Botones de sugerencias rápidas de ciclo */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-slate-400 self-center">Presets:</span>
        {[
          { label: "Semanal (7d)", days: 7 },
          { label: "Quincenal (15d)", days: 15 },
          { label: "Mensual (30d)", days: 30 },
          { label: "Bimestral (60d)", days: 60 },
          { label: "Anual (365d)", days: 365 },
        ].map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setFrequencyDays(p.days.toString())}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              frequencyDays === p.days.toString()
                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tarjeta de cálculo matemático inteligente */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-100 rounded-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
           Plan de Provisión Automática
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white p-2 rounded-xl shadow-xs border border-emerald-100/60">
            <p className="text-[10px] uppercase font-bold text-slate-400">Por Día</p>
            <p className="text-sm font-extrabold text-emerald-700">${dailyCost}</p>
          </div>
          <div className="bg-white p-2 rounded-xl shadow-xs border border-emerald-100/60">
            <p className="text-[10px] uppercase font-bold text-slate-400">Por Semana</p>
            <p className="text-sm font-extrabold text-emerald-700">${weeklyCost}</p>
          </div>
          <div className="bg-white p-2 rounded-xl shadow-xs border border-emerald-100/60">
            <p className="text-[10px] uppercase font-bold text-slate-400">Por Mes</p>
            <p className="text-sm font-extrabold text-emerald-700">${monthlyCost}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fecha de la próxima compra / pago
          </label>
          <input
            type="date"
            name="nextDueDate"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ¿Ya tienes algo apartado hoy? ($)
          </label>
          <input
            type="number"
            name="initialAccumulated"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>
      </div>
      
      {/* Cobro automático opcional */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="pr-2">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              ⚡ Cobro Automático
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Cobrar el gasto y avanzar el ciclo automáticamente al vencer la fecha sin tener que presionar &ldquo;Pagar Gasto&rdquo;.
            </p>
          </div>
          <input
            type="checkbox"
            name="autoPay"
            value="true"
            checked={autoPay}
            onChange={(e) => setAutoPay(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
          />
        </label>

        {autoPay && wallets.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cuenta de donde se cobrará automáticamente:
            </label>
            <select
              name="defaultWalletId"
              required={autoPay}
              value={defaultWalletId}
              onChange={(e) => setDefaultWalletId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-slate-900 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecciona una cuenta...</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (${w.balance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full text-white px-8 py-4 mt-2 rounded-xl font-bold disabled:opacity-50 transition-all shadow-md active:scale-95 ${
          isOneOff 
            ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" 
            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
        }`}
      >
        {loading ? "Creando..." : isOneOff ? "Crear Meta de Gasto Único" : "Crear Apartado de Reserva"}
      </button>
    </form>
  );
}
