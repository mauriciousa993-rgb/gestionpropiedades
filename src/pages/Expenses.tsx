import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import {
  createExpense,
  deleteExpense,
  listExpenses,
  listProperties,
  receiptSignedUrl,
  uploadReceipt,
} from '../data/api'
import { currentPeriod, formatDate, formatMoney, formatPeriod } from '../lib/format'
import type { Expense, ExpenseCategory, Property } from '../lib/types'

const CATEGORY: Record<ExpenseCategory, { label: string; icon: string }> = {
  reparacion: { label: 'Reparación', icon: '🔧' },
  suministros: { label: 'Suministros', icon: '🔌' },
  impuestos: { label: 'Impuestos', icon: '🏛️' },
  seguro: { label: 'Seguro', icon: '🛡️' },
  comunidad: { label: 'Comunidad', icon: '🏢' },
  limpieza: { label: 'Limpieza', icon: '🧹' },
  hipoteca: { label: 'Hipoteca', icon: '🏦' },
  otro: { label: 'Otro', icon: '🧾' },
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      const [e, p] = await Promise.all([listExpenses(), listProperties()])
      setExpenses(e)
      setProperties(p)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties])
  const filtered = useMemo(
    () => expenses.filter((e) => e.period === period),
    [expenses, period],
  )
  const total = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount), 0),
    [filtered],
  )
  const byProperty = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of filtered) {
      const key = e.property_id ?? 'general'
      map.set(key, (map.get(key) ?? 0) + Number(e.amount))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  async function onDelete(e: Expense) {
    if (!confirm('¿Eliminar este gasto?')) return
    await deleteExpense(e.id)
    void load()
  }

  if (loading) return <Spinner label="Cargando gastos…" />
  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Gastos</h1>
          <p className="text-sm text-gray-500">
            Costes de cada propiedad: reparaciones, impuestos, seguros…
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <Button onClick={() => setCreating(true)}>+ Nuevo gasto</Button>
        </div>
      </div>

      {/* Resumen del mes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total gastado en {formatPeriod(period)}
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">{formatMoney(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Por propiedad
          </div>
          {byProperty.length === 0 ? (
            <p className="text-sm text-gray-400">Sin gastos este mes.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {byProperty.map(([key, amount]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">
                    {key === 'general' ? 'General' : propById.get(key)?.name ?? 'Propiedad'}
                  </span>
                  <span className="font-medium text-ink-900">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={`Sin gastos en ${formatPeriod(period)}`}
          description="Registra un gasto para llevar el control de los costes de tus propiedades."
          action={<Button onClick={() => setCreating(true)}>+ Nuevo gasto</Button>}
        />
      ) : (
        <Card className="divide-y divide-gray-100">
          {filtered.map((e) => {
            const meta = CATEGORY[e.category]
            const prop = e.property_id ? propById.get(e.property_id) : undefined
            return (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="font-medium text-ink-900">
                      {meta.label}
                      {e.description ? ` · ${e.description}` : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      {prop?.name ?? 'General'} · {formatDate(e.expense_date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-ink-900">{formatMoney(e.amount)}</span>
                  {e.receipt_url && <ReceiptLink path={e.receipt_url} />}
                  <button
                    onClick={() => onDelete(e)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {creating && (
        <NewExpenseModal
          properties={properties}
          defaultPeriod={period}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function ReceiptLink({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)
  async function open() {
    setLoading(true)
    const url = await receiptSignedUrl(path)
    setLoading(false)
    if (url) window.open(url, '_blank', 'noopener')
    else alert('No se pudo abrir la factura.')
  }
  return (
    <button
      onClick={open}
      disabled={loading}
      className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
    >
      {loading ? '…' : '📷 Factura'}
    </button>
  )
}

function NewExpenseModal({
  properties,
  defaultPeriod,
  onClose,
  onSaved,
}: {
  properties: Property[]
  defaultPeriod: string
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const [propertyId, setPropertyId] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('reparacion')
  const [period, setPeriod] = useState(defaultPeriod)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      let receiptPath: string | null = null
      if (file && session) receiptPath = await uploadReceipt(file, session.user.id)
      await createExpense({
        property_id: propertyId || null,
        category,
        period,
        expense_date: date || null,
        amount: Number(amount) || 0,
        description: description.trim() || null,
        receipt_url: receiptPath,
      })
      onSaved()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nuevo gasto"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-gasto" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-gasto" onSubmit={onSubmit} className="space-y-4">
        <Field label="Propiedad">
          <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">General (sin propiedad concreta)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo de gasto">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {Object.entries(CATEGORY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Importe (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej. 120"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mes">
            <Input
              type="month"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </Field>
          <Field label="Fecha del gasto">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Descripción (opcional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Cambio de grifo del baño"
          />
        </Field>
        <Field label="Foto de la factura (opcional)">
          <Input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}
