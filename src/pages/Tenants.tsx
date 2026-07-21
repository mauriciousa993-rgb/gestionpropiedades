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
import {
  createTenant,
  deleteTenant,
  listPaymentsByTenant,
  listProperties,
  listRooms,
  listTenants,
  updateTenant,
} from '../data/api'
import { formatDate, formatMoney, formatPeriod } from '../lib/format'
import type { Payment, Property, Room, Tenant, TenantStatus } from '../lib/types'

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [creating, setCreating] = useState(false)
  const [historyTenant, setHistoryTenant] = useState<Tenant | null>(null)

  async function load() {
    try {
      const [t, p, r] = await Promise.all([listTenants(), listProperties(), listRooms()])
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

  const locationLabel = useMemo(() => {
    const propById = new Map(properties.map((p) => [p.id, p]))
    const roomById = new Map(rooms.map((r) => [r.id, r]))
    return (t: Tenant): string => {
      if (t.room_id) {
        const room = roomById.get(t.room_id)
        const prop = room ? propById.get(room.property_id) : undefined
        return room ? `${prop?.name ?? 'Piso'} · ${room.name}` : 'Habitación'
      }
      if (t.property_id) return propById.get(t.property_id)?.name ?? 'Propiedad'
      return 'Sin asignar'
    }
  }, [properties, rooms])

  async function onDelete(t: Tenant) {
    if (!confirm(`¿Eliminar al inquilino "${t.full_name}"?`)) return
    await deleteTenant(t.id)
    void load()
  }

  if (loading) return <Spinner label="Cargando inquilinos…" />
  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Inquilinos</h1>
          <p className="text-sm text-gray-500">La ficha de cada persona que te alquila.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nuevo inquilino</Button>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon="👤"
          title="Aún no tienes inquilinos"
          description="Añade a las personas que alquilan tus propiedades o habitaciones."
          action={<Button onClick={() => setCreating(true)}>+ Añadir inquilino</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tenants.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {t.full_name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-ink-900">{t.full_name}</h3>
                    <Badge tone={t.status === 'activo' ? 'green' : 'gray'}>
                      {t.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                    <div>🏠 {locationLabel(t)}</div>
                    {t.phone && <div>📞 {t.phone}</div>}
                    {t.email && <div className="truncate">✉ {t.email}</div>}
                    {t.move_in_date && <div>📅 Desde {formatDate(t.move_in_date)}</div>}
                  </div>
                  {t.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">{t.notes}</p>
                  )}
                  <div className="mt-3 flex gap-3 border-t border-gray-100 pt-3 text-sm">
                    <button
                      onClick={() => setHistoryTenant(t)}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      Historial de pagos
                    </button>
                    <button
                      onClick={() => setEditing(t)}
                      className="text-gray-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(t)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TenantModal
          tenant={editing}
          properties={properties}
          rooms={rooms}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            void load()
          }}
        />
      )}

      {historyTenant && (
        <HistoryModal tenant={historyTenant} onClose={() => setHistoryTenant(null)} />
      )}
    </div>
  )
}

/* ---------- Alta / edición de inquilino ---------- */
function TenantModal({
  tenant,
  properties,
  rooms,
  onClose,
  onSaved,
}: {
  tenant: Tenant | null
  properties: Property[]
  rooms: Room[]
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(tenant?.full_name ?? '')
  const [phone, setPhone] = useState(tenant?.phone ?? '')
  const [email, setEmail] = useState(tenant?.email ?? '')
  const [moveIn, setMoveIn] = useState(tenant?.move_in_date ?? '')
  const [status, setStatus] = useState<TenantStatus>(tenant?.status ?? 'activo')
  const [notes, setNotes] = useState(tenant?.notes ?? '')
  // valor combinado: "prop:<id>" o "room:<id>" o ""
  const [assignment, setAssignment] = useState(
    tenant?.room_id
      ? `room:${tenant.room_id}`
      : tenant?.property_id
        ? `prop:${tenant.property_id}`
        : '',
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const options = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    for (const p of properties) {
      if (p.rental_type === 'completa') {
        opts.push({ value: `prop:${p.id}`, label: `${p.name} (completa)` })
      } else {
        for (const r of rooms.filter((r) => r.property_id === p.id)) {
          opts.push({ value: `room:${r.id}`, label: `${p.name} · ${r.name}` })
        }
      }
    }
    return opts
  }, [properties, rooms])

  function resolveAssignment(): { property_id: string | null; room_id: string | null } {
    if (assignment.startsWith('room:')) {
      const roomId = assignment.slice(5)
      const room = rooms.find((r) => r.id === roomId)
      return { room_id: roomId, property_id: room?.property_id ?? null }
    }
    if (assignment.startsWith('prop:')) {
      return { property_id: assignment.slice(5), room_id: null }
    }
    return { property_id: null, room_id: null }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const loc = resolveAssignment()
    const values = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      move_in_date: moveIn || null,
      status,
      notes: notes.trim() || null,
      ...loc,
    }
    try {
      if (tenant) await updateTenant(tenant.id, values)
      else await createTenant(values)
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
      title={tenant ? 'Editar inquilino' : 'Nuevo inquilino'}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-inquilino" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-inquilino" onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre completo">
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Correo electrónico">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de entrada">
            <Input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
          </Field>
          <Field label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value as TenantStatus)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </Field>
        </div>
        <Field label="¿Dónde vive?">
          <Select value={assignment} onChange={(e) => setAssignment(e.target.value)}>
            <option value="">Sin asignar</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notas">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}

/* ---------- Historial de pagos ---------- */
function HistoryModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPaymentsByTenant(tenant.id)
      .then(setPayments)
      .finally(() => setLoading(false))
  }, [tenant.id])

  return (
    <Modal open onClose={onClose} title={`Pagos de ${tenant.full_name}`}>
      {loading ? (
        <Spinner />
      ) : payments.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          Todavía no hay pagos registrados para este inquilino.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-ink-900">{formatPeriod(p.period)}</div>
                <div className="text-xs text-gray-500">
                  {p.paid_date ? `Pagado ${formatDate(p.paid_date)}` : `Vence ${formatDate(p.due_date)}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-ink-900">{formatMoney(p.amount_paid)}</div>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
