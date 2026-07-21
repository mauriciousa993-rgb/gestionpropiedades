import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/', label: 'Resumen', icon: '📊', end: true },
  { to: '/propiedades', label: 'Propiedades', icon: '🏠' },
  { to: '/inquilinos', label: 'Inquilinos', icon: '👤' },
  { to: '/pagos', label: 'Pagos', icon: '💶' },
  { to: '/servicios', label: 'Servicios', icon: '🧾' },
  { to: '/gastos', label: 'Gastos', icon: '📉' },
]

export default function Layout() {
  const { session, signOut } = useAuth()
  const [openMobile, setOpenMobile] = useState(false)

  const links = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpenMobile(false)}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-500 text-white'
                : 'text-brand-100 hover:bg-ink-700 hover:text-white',
            ].join(' ')
          }
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-full">
      {/* Barra superior (móvil) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-700 bg-ink-900 px-4 py-3 text-white lg:hidden">
        <button
          onClick={() => setOpenMobile((v) => !v)}
          className="rounded-lg p-2 hover:bg-ink-700"
          aria-label="Menú"
        >
          ☰
        </button>
        <span className="font-semibold">Gestión de Propiedades</span>
        <span className="w-9" />
      </header>

      {/* Menú desplegable móvil */}
      {openMobile && (
        <div className="border-b border-ink-700 bg-ink-900 px-4 py-3 lg:hidden">{links}</div>
      )}

      <div className="lg:flex">
        {/* Barra lateral (escritorio) */}
        <aside className="hidden w-64 shrink-0 flex-col bg-ink-900 p-4 lg:flex lg:min-h-screen">
          <div className="mb-8 flex items-center gap-3 px-2 pt-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 font-bold text-ink-900">
              RP
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Gestión de</div>
              <div className="text-sm font-semibold text-brand-300">Propiedades</div>
            </div>
          </div>
          {links}
          <div className="mt-auto border-t border-ink-700 pt-4">
            <div className="truncate px-2 text-xs text-brand-200">{session?.user.email}</div>
            <button
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-100 hover:bg-ink-700 hover:text-white"
            >
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
