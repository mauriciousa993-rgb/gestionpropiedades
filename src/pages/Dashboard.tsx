import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, EmptyState, Spinner } from '../components/ui'
import { listExpenses, listPayments, listProperties, listTenants } from '../data/api'
import { currentPeriod, formatDate, formatMoney, formatPeriod } from '../lib/format'
import type { Expense, Payment, Property, Tenant } from '../lib/types'

interface Stat {
  label: string
  value: string
  sub?: string
  tone?: 'brand' | 'green' | 'amber' | 'ink' | 'red'
}

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listProperties(), listTenants(), listPayments(), listExpenses()])
      .then(([p, t, pay, exp]) => {
        setProperties(p)
        setTenants(t)
        setPayments(pay)
        setExpenses(exp)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const period = currentPeriod()
  const tenantsById = useMemo(
    () => new Map(tenants.map((t) => [t.id, t])),
    [tenants],
  )

  const stats: Stat[] = useMemo(() => {
    const mes = payments.filter((p) => p.period === period)
    const cobrado = mes.reduce((s, p) => s + Number(p.amount_paid), 0)
    const pendiente = mes.reduce(
      (s, p) => s + Math.max(0, Number(p.amount_due) - Number(p.amount_paid)),
      0,
    )
    const gastos = expenses
      .filter((e) => e.period === period)
      .reduce((s, e) => s + Number(e.amount), 0)
    const beneficio = cobrado - gastos
    const activos = tenants.filter((t) => t.status === 'activo').length
    return [
      {
        label: `Ingresos · ${formatPeriod(period)}`,
        value: formatMoney(cobrado),
        tone: 'green',
      },
      {
        label: 'Gastos del mes',
        value: formatMoney(gastos),
        tone: 'red',
      },
      {
        label: 'Beneficio (ingresos − gastos)',
        value: formatMoney(beneficio),
        tone: beneficio >= 0 ? 'green' : 'red',
      },
      {
        label: 'Pendiente de cobro',
        value: formatMoney(pendiente),
        tone: 'amber',
      },
      {
        label: 'Propiedades',
        value: String(properties.length),
        tone: 'brand',
      },
      {
        label: 'Inquilinos activos',
        value: String(activos),
        tone: 'ink',
      },
    ]
  }, [payments, expenses, tenants, properties, period])

  const pendientes = useMemo(
    () =>
      payments
        .filter((p) => p.status !== 'pagado')
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
        .slice(0, 8),
    [payments],
  )

  if (loading) return <Spinner label="Cargando resumen…" />
  if (error)
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Resumen</h1>
        <p className="text-sm text-gray-500">Un vistazo rápido a tu negocio.</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {s.label}
            </div>
            <div className={'mt-2 text-2xl font-bold ' + toneClass(s.tone)}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Pagos pendientes */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Pagos pendientes</h2>
          <Link to="/pagos" className="text-sm font-medium text-brand-600 hover:underline">
            Ver todos →
          </Link>
        </div>

        {pendientes.length === 0 ? (
          <EmptyState
            icon="✅"
            title="Sin pagos pendientes"
            description="Todo al día. Cuando registres cobros aparecerán aquí los que falten."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {pendientes.map((p) => {
              const tenant = p.tenant_id ? tenantsById.get(p.tenant_id) : undefined
              const restante = Math.max(0, Number(p.amount_due) - Number(p.amount_paid))
              return (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-ink-900">
                      {tenant?.full_name ?? 'Inquilino'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPeriod(p.period)} · vence {formatDate(p.due_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-ink-900">
                      {formatMoney(restante)}
                    </span>
                    <Badge tone={p.status === 'parcial' ? 'amber' : 'red'}>
                      {p.status === 'parcial' ? 'Parcial' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function toneClass(tone: Stat['tone']): string {
  switch (tone) {
    case 'green':
      return 'text-green-600'
    case 'amber':
      return 'text-amber-600'
    case 'red':
      return 'text-red-600'
    case 'brand':
      return 'text-brand-600'
    default:
      return 'text-ink-900'
  }
}
