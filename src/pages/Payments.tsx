import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
} from '../components/ui'
import {
  createPayment,
  deletePayment,
  listPayments,
  listProperties,
  listRooms,
  listTenants,
  updatePayment,
} from '../data/api'
import { currentPeriod, formatDate, formatMoney, formatPeriod } from '../lib/format'
import type { Payment, PaymentStatus, Property, Room, Tenant } from '../lib/types'

function computeStatus(due: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'pendiente'
  if (paid >= due) return 'pagado'
  return 'parcial'
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(currentPeriod())
  const [creating, setCreating] = useState(false)
  const [collecting, setCollecting] = useState<Payment | null>(null)

  async function load() {
    try {
      const [pay, t, p, r] = await Promise.all([
        listPayments(),
        listTenants(),
        listProperties(),
        listRooms(),
      ])
      setPayments(pay)
      setTenants(t)
      setProperties(p)
      setRooms(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const tenantsById = useMemo(() => new Map(tenants.map((t) => [t.id, t])), [tenants])
  const filtered = useMemo(
    () => payments.filter((p) => p.period === period),
    [payments, period],
  )

  const totals = useMemo(() => {
    const cobrado = filtered.reduce((s, p) => s + Number(p.amount_paid), 0)
    const pendiente = filtered.reduce(
      (s, p) => s + Math.max(0, Number(p.amount_due) - Number(p.amount_paid)),
      0,
    )
    return { cobrado, pendiente }
  }, [filtered])

  async function onDelete(p: Payment) {
    if (!confirm('¿Eliminar este registro de pago?')) return
    await deletePayment(p.id)
    void load()
  }

  if (loading) return <Spinner label="Cargando pagos…" />
  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Pagos</h1>
          <p className="text-sm text-gray-500">Controla quién ha pagado y quién no.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <Button onClick={() => setCreating(true)}>+ Registrar cobro</Button>
        </div>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Cobrado en {formatPeriod(period)}
          </div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {formatMoney(totals.cobrado)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Pendiente
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {formatMoney(totals.pendiente)}
          </div>
        </Card>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="💶"
          title={`Sin cobros en ${formatPeriod(period)}`}
          description="Registra un cobro para empezar a llevar el control de este mes."
          action={<Button onClick={() => setCreating(true)}>+ Registrar cobro</Button>}
        />
      ) : (
        <Card className="divide-y divide-gray-100">
          {filtered.map((p) => {
            const tenant = p.tenant_id ? tenantsById.get(p.tenant_id) : undefined
            const restante = Math.max(0, Number(p.amount_due) - Number(p.amount_paid))
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="font-medium text-ink-900">
                    {tenant?.full_name ?? 'Inquilino eliminado'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Vence {formatDate(p.due_date)}
                    {p.paid_date && ` · Pagado ${formatDate(p.paid_date)}`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-ink-900">
                      {formatMoney(p.amount_paid)}{' '}
                      <span className="text-xs font-normal text-gray-400">
                        / {formatMoney(p.amount_due)}
                      </span>
                    </div>
                    {restante > 0 && (
                      <div className="text-xs text-amber-600">Faltan {formatMoney(restante)}</div>
                    )}
                  </div>
                  <Badge
                    tone={
                      p.status === 'pagado' ? 'green' : p.status === 'parcial' ? 'amber' : 'red'
                    }
                  >
                    {p.status === 'pagado'
                      ? 'Pagado'
                      : p.status === 'parcial'
                        ? 'Parcial'
                        : 'Pendiente'}
                  </Badge>
                  <div className="flex gap-2">
                    {p.status !== 'pagado' && (
                      <Button variant="secondary" onClick={() => setCollecting(p)}>
                        Registrar pago
                      </Button>
                    )}
                    <button
                      onClick={() => onDelete(p)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {creating && (
        <CreatePaymentModal
          tenants={tenants.filter((t) => t.status === 'activo')}
          properties={properties}
          rooms={rooms}
          defaultPeriod={period}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            void load()
          }}
        />
      )}

      {collecting && (
        <CollectModal
          payment={collecting}
          onClose={() => setCollecting(null)}
          onSaved={() => {
            setCollecting(null)
            void load()
          }}
        />
      )}
    </div>
  )
}

/* ---------- Registrar un cobro nuevo ---------- */
function CreatePaymentModal({
  tenants,
  properties,
  rooms,
  defaultPeriod,
  onClose,
  onSaved,
}: {
  tenants: Tenant[]
  properties: Property[]
  rooms: Room[]
  defaultPeriod: string
  onClose: () => void
  onSaved: () => void
}) {
  const [tenantId, setTenantId] = useState('')
  const [period, setPeriod] = useState(defaultPeriod)
  const [amountDue, setAmountDue] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paidDate, setPaidDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function onTenantChange(id: string) {
    setTenantId(id)
    const tenant = tenants.find((t) => t.id === id)
    if (!tenant) return
    // autocompletar importe con el alquiler correspondiente
    let rent: number | null = null
    if (tenant.room_id) rent = rooms.find((r) => r.id === tenant.room_id)?.monthly_rent ?? null
    else if (tenant.property_id)
      rent = properties.find((p) => p.id === tenant.property_id)?.monthly_rent ?? null
    if (rent != null) setAmountDue(String(rent))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const tenant = tenants.find((t) => t.id === tenantId)
    const due = Number(amountDue) || 0
    const paid = Number(amountPaid) || 0
    try {
      await createPayment({
        tenant_id: tenantId || null,
        property_id: tenant?.property_id ?? null,
        room_id: tenant?.room_id ?? null,
        period,
        due_date: dueDate || null,
        amount_due: due,
        amount_paid: paid,
        paid_date: paid > 0 ? paidDate || new Date().toISOString().slice(0, 10) : null,
        status: computeStatus(due, paid),
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
      title="Registrar cobro"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-pago" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-pago" onSubmit={onSubmit} className="space-y-4">
        <Field label="Inquilino">
          <Select required value={tenantId} onChange={(e) => onTenantChange(e.target.value)}>
            <option value="">Selecciona…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mes">
            <Input
              type="month"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </Field>
          <Field label="Fecha de vencimiento">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Importe a cobrar (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
            />
          </Field>
          <Field label="Ya pagado (€)" hint="Déjalo en 0 si aún no ha pagado">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </Field>
        </div>
        {Number(amountPaid) > 0 && (
          <Field label="Fecha del pago">
            <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </Field>
        )}
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}

/* ---------- Registrar un pago sobre un cobro existente ---------- */
function CollectModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: Payment
  onClose: () => void
  onSaved: () => void
}) {
  const restante = Math.max(0, Number(payment.amount_due) - Number(payment.amount_paid))
  const [amount, setAmount] = useState(String(restante))
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const nuevoPagado = Number(payment.amount_paid) + (Number(amount) || 0)
    try {
      await updatePayment(payment.id, {
        amount_paid: nuevoPagado,
        paid_date: paidDate,
        status: computeStatus(Number(payment.amount_due), nuevoPagado),
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
      title="Registrar pago recibido"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-cobro" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <form id="form-cobro" onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Pendiente actual:{' '}
          <span className="font-semibold text-ink-900">{formatMoney(restante)}</span>
        </p>
        <Field label="Importe recibido (€)" hint="Puedes registrar un pago parcial">
          <Input
            type="number"
            min={0}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Fecha del pago">
          <Input
            type="date"
            required
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}
