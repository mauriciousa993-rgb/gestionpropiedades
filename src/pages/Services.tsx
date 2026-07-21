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
  Textarea,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import {
  addUtilityShares,
  createUtilityBill,
  deleteUtilityBill,
  listProperties,
  listTenants,
  listUtilityBills,
  listUtilityShares,
  receiptSignedUrl,
  updateUtilityShare,
  uploadReceipt,
} from '../data/api'
import { currentPeriod, formatMoney, formatPeriod } from '../lib/format'
import type {
  Property,
  Tenant,
  UtilityBill,
  UtilityKind,
  UtilityShare,
} from '../lib/types'

const KIND: Record<UtilityKind, { label: string; icon: string }> = {
  agua: { label: 'Agua', icon: '💧' },
  luz: { label: 'Luz', icon: '💡' },
  gas: { label: 'Gas', icon: '🔥' },
  internet: { label: 'Internet', icon: '🌐' },
  comunidad: { label: 'Comunidad', icon: '🏢' },
  otro: { label: 'Otro', icon: '🧾' },
}

// Reparte un total en n partes iguales al céntimo; el resto se suma a los primeros.
function splitEven(total: number, n: number): number[] {
  if (n <= 0) return []
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  const rem = cents - base * n
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100)
}

// Inquilinos activos que ocupan una propiedad (piso completo o alguna habitación).
function occupantsOfProperty(tenants: Tenant[], propertyId: string): Tenant[] {
  return tenants.filter((t) => t.property_id === propertyId && t.status === 'activo')
}

export default function Services() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [bills, setBills] = useState<UtilityBill[]>([])
  const [shares, setShares] = useState<UtilityShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      const [p, t, b, s] = await Promise.all([
        listProperties(),
        listTenants(),
        listUtilityBills(),
        listUtilityShares(),
      ])
      setProperties(p)
      setTenants(t)
      setBills(b)
      setShares(s)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const propById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties])
  const tenantById = useMemo(() => new Map(tenants.map((t) => [t.id, t])), [tenants])
  const sharesByBill = useMemo(() => {
    const map = new Map<string, UtilityShare[]>()
    for (const s of shares) {
      const arr = map.get(s.bill_id) ?? []
      arr.push(s)
      map.set(s.bill_id, arr)
    }
    return map
  }, [shares])

  async function toggleShare(s: UtilityShare) {
    const paid = !s.paid
    await updateUtilityShare(s.id, {
      paid,
      paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
    })
    void load()
  }

  async function onDeleteBill(b: UtilityBill) {
    if (!confirm('¿Eliminar este recibo y su reparto?')) return
    await deleteUtilityBill(b.id)
    void load()
  }

  if (loading) return <Spinner label="Cargando servicios…" />
  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Servicios</h1>
          <p className="text-sm text-gray-500">
            Recibos de agua, luz, etc. repartidos entre los inquilinos.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nuevo recibo</Button>
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="Aún no hay recibos"
          description="Registra un recibo de agua o luz y la app calcula cuánto le toca a cada inquilino."
          action={<Button onClick={() => setCreating(true)}>+ Añadir recibo</Button>}
        />
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => {
            const meta = KIND[bill.kind]
            const prop = propById.get(bill.property_id)
            const billShares = sharesByBill.get(bill.id) ?? []
            const paidCount = billShares.filter((s) => s.paid).length
            const estado = estadoRecibo(billShares.length, paidCount)
            return (
              <Card key={bill.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <div className="font-semibold text-ink-900">
                        {meta.label} · {prop?.name ?? 'Propiedad'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPeriod(bill.period)} · Total{' '}
                        <span className="font-medium text-ink-800">
                          {formatMoney(bill.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={estado.tone}>{estado.label}</Badge>
                    {bill.receipt_url && <ReceiptButton path={bill.receipt_url} />}
                    <button
                      onClick={() => onDeleteBill(bill)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {bill.notes && (
                  <p className="mt-2 text-sm text-gray-500">{bill.notes}</p>
                )}

                {/* Reparto por inquilino */}
                <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
                  {billShares.length === 0 ? (
                    <p className="pt-3 text-sm text-gray-500">
                      Este recibo no tiene reparto (no había inquilinos activos).
                    </p>
                  ) : (
                    billShares.map((s) => {
                      const tenant = s.tenant_id ? tenantById.get(s.tenant_id) : undefined
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div className="text-sm">
                            <span className="text-ink-800">
                              👤 {tenant?.full_name ?? 'Inquilino'}
                            </span>
                            <span className="ml-2 font-medium text-ink-900">
                              {formatMoney(s.amount)}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleShare(s)}
                            className={
                              'rounded-lg px-3 py-1 text-xs font-medium transition-colors ' +
                              (s.paid
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                            }
                          >
                            {s.paid ? '✓ Pagado' : 'Marcar pagado'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {creating && (
        <NewBillModal
          properties={properties}
          tenants={tenants}
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

function estadoRecibo(total: number, pagados: number) {
  if (total === 0) return { label: 'Sin reparto', tone: 'gray' as const }
  if (pagados === total) return { label: 'Cobrado', tone: 'green' as const }
  if (pagados > 0) return { label: `Parcial ${pagados}/${total}`, tone: 'amber' as const }
  return { label: 'Pendiente', tone: 'red' as const }
}

/* ---------- Botón para ver la foto del recibo (URL temporal) ---------- */
function ReceiptButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)
  async function open() {
    setLoading(true)
    const url = await receiptSignedUrl(path)
    setLoading(false)
    if (url) window.open(url, '_blank', 'noopener')
    else alert('No se pudo abrir la foto del recibo.')
  }
  return (
    <button
      onClick={open}
      disabled={loading}
      className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
    >
      {loading ? '…' : '📷 Ver recibo'}
    </button>
  )
}

/* ---------- Alta de un recibo con reparto ---------- */
function NewBillModal({
  properties,
  tenants,
  onClose,
  onSaved,
}: {
  properties: Property[]
  tenants: Tenant[]
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const [propertyId, setPropertyId] = useState('')
  const [kind, setKind] = useState<UtilityKind>('luz')
  const [period, setPeriod] = useState(currentPeriod())
  const [total, setTotal] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const occupants = useMemo(
    () => (propertyId ? occupantsOfProperty(tenants, propertyId) : []),
    [tenants, propertyId],
  )
  const totalNum = Number(total) || 0
  const perPerson =
    occupants.length > 0 ? splitEven(totalNum, occupants.length)[0] : 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (occupants.length === 0) {
      setErr('Esa propiedad no tiene inquilinos activos para repartir el recibo.')
      return
    }
    setSaving(true)
    try {
      let receiptPath: string | null = null
      if (file && session) {
        receiptPath = await uploadReceipt(file, session.user.id)
      }
      const bill = await createUtilityBill({
        property_id: propertyId,
        kind,
        period,
        total_amount: totalNum,
        receipt_url: receiptPath,
        notes: notes.trim() || null,
      })
      const amounts = splitEven(totalNum, occupants.length)
      await addUtilityShares(
        occupants.map((o, i) => ({
          bill_id: bill.id,
          tenant_id: o.id,
          amount: amounts[i],
          paid: false,
        })),
      )
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
      title="Nuevo recibo de servicio"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-recibo" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar y repartir'}
          </Button>
        </>
      }
    >
      <form id="form-recibo" onSubmit={onSubmit} className="space-y-4">
        <Field label="Propiedad">
          <Select
            required
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">Selecciona…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Servicio">
            <Select value={kind} onChange={(e) => setKind(e.target.value as UtilityKind)}>
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mes">
            <Input
              type="month"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Importe total del recibo (€)">
          <Input
            type="number"
            min={0}
            step="0.01"
            required
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="Ej. 60"
          />
        </Field>

        <Field label="Foto del recibo (opcional)">
          <Input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>

        {/* Vista previa del reparto */}
        {propertyId && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-ink-800">
            {occupants.length === 0 ? (
              <span className="text-amber-700">
                ⚠ Esta propiedad no tiene inquilinos activos. Asigna inquilinos antes de
                repartir.
              </span>
            ) : (
              <>
                Se dividirá entre <strong>{occupants.length}</strong>{' '}
                {occupants.length === 1 ? 'persona' : 'personas'} →{' '}
                <strong>{formatMoney(perPerson)}</strong> cada una.
              </>
            )}
          </div>
        )}

        <Field label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Lectura de contador, periodo bimestral…"
          />
        </Field>

        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}
