"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import ShortcutsModal from "./ShortcutsModal";
import { getUserApiToken } from "../actions/user";

interface NavigationProps {
  user?: {
    name?: string | null;
    username?: string | null;
  } | null;
}

const NAV_ITEMS = [
  {
    href: "/",
    label: "Resumen",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Cuentas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: "/cards",
    label: "Tarjetas",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/budgets",
    label: "Presupuestos",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/savings",
    label: "Apartados",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
];

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [isCopyingToken, setIsCopyingToken] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopyToken = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCopyingToken(true);
    try {
      const token = await getUserApiToken();
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2500);
    } catch (err) {
      console.error("Error al copiar token:", err);
    } finally {
      setIsCopyingToken(false);
    }
  };

  // Sincronizar estado inicial de tema en el cliente
  useEffect(() => {
    const isDarkMode =
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setIsDark(isDarkMode);
  }, []);

  // Cerrar menú al hacer clic fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // No mostrar navegación en la pantalla de login
  if (pathname.startsWith("/login")) {
    return null;
  }

  const displayName = user?.name || user?.username || "Usuario";

  return (
    <>
      {/* Barra superior para Desktop y Tablets */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Nombre */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-blue-600 transition-colors">
                  F
                </span>
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  Finanzas
                </span>
              </Link>

              {/* Menú de Enlaces Desktop */}
              <nav className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Menú de Usuario y Opciones Desplegable */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                aria-label="Menú de usuario y preferencias"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Opciones</p>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isMenuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Menú Desplegable */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Encabezado del usuario */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Conectado como</p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {displayName}
                    </p>
                    {user?.username && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        @{user.username}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="p-1.5 space-y-1">
                    {/* Botón Activar Modo Noche */}
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isDark
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {isDark ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            Modo noche
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isDark ? "Activado" : "Desactivado"}
                          </p>
                        </div>
                      </div>

                      {/* Switch Visual */}
                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                          isDark ? "bg-slate-900" : "bg-slate-200"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            isDark ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </button>

                    {/* Botón Copiar Token de Atajos */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        disabled={isCopyingToken}
                        className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              tokenCopied
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                            }`}
                          >
                            {tokenCopied ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${tokenCopied ? "text-emerald-600 font-bold" : "text-slate-800"}`}>
                              {tokenCopied ? "¡Copiado al portapapeles!" : "Copiar Token"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {tokenCopied ? "Pégalo en tu atajo" : "Para atajos de iPhone"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                            tokenCopied
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                          }`}
                        >
                          {tokenCopied ? "✓" : "Copiar"}
                        </span>
                      </button>

                      {/* Botón info para ver Guía y URLs */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsShortcutsModalOpen(true);
                          setIsMenuOpen(false);
                        }}
                        title="Ver URLs y configuración"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>

                    <div className="h-px bg-gray-100 my-1" />

                    {/* Botón Cerrar Sesión */}
                    <a
                      href="/api/auth/signout"
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left font-semibold text-xs group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-rose-600">Cerrar Sesión</p>
                        <p className="text-[10px] text-rose-400">Finalizar sesión actual</p>
                      </div>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Barra de Navegación Inferior (Móvil) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 safe-area-pb shadow-lg">
        <div className="flex justify-around items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-slate-400 hover:text-slate-600 font-medium"
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? "bg-blue-50" : ""}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modal de configuración de Atajos de iOS */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </>
  );
}
