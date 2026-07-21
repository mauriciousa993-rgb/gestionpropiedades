import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Spinner,
} from '../components/ui'
import {
  createRoom,
  deleteProperty,
  deleteRoom,
  getProperty,
  listRooms,
  listTenants,
} from '../data/api'
import { formatMoney } from '../lib/format'
import type { Property, Room, Tenant } from '../lib/types'

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [property, setProperty] = useState<Property | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomModal, setRoomModal] = useState(false)

  async function load() {
    if (!id) return
    try {
      const [p, r, t] = await Promise.all([
        getProperty(id),
        listRooms(id),
        listTenants(),
      ])
      setProperty(p)
      setRooms(r)
      setTenants(t)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function onDeleteProperty() {
    if (!property) return
    if (!confirm(`¿Eliminar la propiedad "${property.name}"? Esta acción no se puede deshacer.`))
      return
    await deleteProperty(property.id)
    navigate('/propiedades')
  }

  async function onDeleteRoom(room: Room) {
    if (!confirm(`¿Eliminar la habitación "${room.name}"?`)) return
    await deleteRoom(room.id)
    void load()
  }

  if (loading) return <Spinner label="Cargando propiedad…" />
  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>
  if (!property)
    return (
      <EmptyState
        icon="🔍"
        title="Propiedad no encontrada"
        action={
          <Link to="/propiedades">
            <Button variant="secondary">Volver a propiedades</Button>
          </Link>
        }
      />
    )

  const tenantFull = tenants.find(
    (t) => t.property_id === property.id && !t.room_id && t.status === 'activo',
  )

  return (
    <div className="space-y-6">
      <Link to="/propiedades" className="text-sm text-brand-600 hover:underline">
        ← Volver a propiedades
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{property.name}</h1>
          {property.address && <p className="text-sm text-gray-500">{property.address}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="danger" onClick={onDeleteProperty}>
            Eliminar
          </Button>
        </div>
      </div>

      {/* Ficha de datos */}
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Info label="Tipo">
            {property.rental_type === 'habitaciones' ? 'Por habitaciones' : 'Completa'}
          </Info>
          <Info label="Habitaciones">{property.bedrooms}</Info>
          <Info label="Baños">{property.bathrooms}</Info>
          {property.rental_type === 'completa' && (
            <Info label="Alquiler / mes">{formatMoney(property.monthly_rent)}</Info>
          )}
        </div>
        {property.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Notas
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{property.notes}</p>
          </div>
        )}
      </Card>

      {/* Habitaciones o inquilino */}
      {property.rental_type === 'habitaciones' ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">Habitaciones</h2>
            <Button onClick={() => setRoomModal(true)}>+ Añadir habitación</Button>
          </div>
          {rooms.length === 0 ? (
            <EmptyState
              icon="🚪"
              title="Sin habitaciones todavía"
              description="Añade las habitaciones de este piso para gestionarlas por separado."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rooms.map((room) => {
                const occupant = tenants.find(
                  (t) => t.room_id === room.id && t.status === 'activo',
                )
                return (
                  <Card key={room.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-ink-900">{room.name}</div>
                        <div className="mt-1 text-sm text-gray-500">
                          {room.area_m2 ? `${room.area_m2} m² · ` : ''}
                          {formatMoney(room.monthly_rent)}/mes
                        </div>
                      </div>
                      <Badge tone={occupant ? 'green' : 'blue'}>
                        {occupant ? 'Ocupada' : 'Libre'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                      <span className="text-gray-600">
                        {occupant ? `👤 ${occupant.full_name}` : 'Sin inquilino'}
                      </span>
                      <button
                        onClick={() => onDeleteRoom(room)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <Card className="p-5">
          <h2 className="mb-2 text-lg font-semibold text-ink-900">Inquilino actual</h2>
          {tenantFull ? (
            <Link
              to="/inquilinos"
              className="flex items-center gap-3 text-sm text-ink-800 hover:text-brand-600"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
                {tenantFull.full_name.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="font-medium">{tenantFull.full_name}</div>
                <div className="text-xs text-gray-500">{tenantFull.phone ?? 'Sin teléfono'}</div>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-gray-500">
              Esta propiedad está libre. Asigna un inquilino desde la sección{' '}
              <Link to="/inquilinos" className="text-brand-600 hover:underline">
                Inquilinos
              </Link>
              .
            </p>
          )}
        </Card>
      )}

      <RoomModal
        open={roomModal}
        propertyId={property.id}
        onClose={() => setRoomModal(false)}
        onSaved={() => {
          setRoomModal(false)
          void load()
        }}
      />
    </div>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 font-medium text-ink-900">{children}</div>
    </div>
  )
}

function RoomModal({
  open,
  propertyId,
  onClose,
  onSaved,
}: {
  open: boolean
  propertyId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [rent, setRent] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await createRoom({
        property_id: propertyId,
        name: name.trim(),
        area_m2: area ? Number(area) : null,
        monthly_rent: rent ? Number(rent) : null,
      })
      setName('')
      setArea('')
      setRent('')
      onSaved()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva habitación"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-habitacion" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-habitacion" onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Habitación 1"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Área (m²)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </Field>
          <Field label="Alquiler (€/mes)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </Field>
        </div>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}
