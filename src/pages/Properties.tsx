import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
import { createProperty, listProperties, listRooms, listTenants } from '../data/api'
import { formatMoney } from '../lib/format'
import type { Property, RentalType, Room, Tenant } from '../lib/types'

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    try {
      const [p, r, t] = await Promise.all([listProperties(), listRooms(), listTenants()])
      setProperties(p)
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
  }, [])

  // Ocupación por propiedad
  const occupancy = useMemo(() => {
    const map = new Map<string, { total: number; occupied: number }>()
    for (const prop of properties) {
      if (prop.rental_type === 'habitaciones') {
        const propRooms = rooms.filter((r) => r.property_id === prop.id)
        const occupied = propRooms.filter((r) =>
          tenants.some((t) => t.room_id === r.id && t.status === 'activo'),
        ).length
        map.set(prop.id, { total: propRooms.length, occupied })
      } else {
        const occupied = tenants.some(
          (t) => t.property_id === prop.id && !t.room_id && t.status === 'activo',
        )
        map.set(prop.id, { total: 1, occupied: occupied ? 1 : 0 })
      }
    }
    return map
  }, [properties, rooms, tenants])

  if (loading) return <Spinner label="Cargando propiedades…" />
  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Propiedades</h1>
          <p className="text-sm text-gray-500">Todas tus propiedades en un solo lugar.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Nueva propiedad</Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="Aún no tienes propiedades"
          description="Añade tu primer piso o casa para empezar a gestionarlo."
          action={<Button onClick={() => setModalOpen(true)}>+ Añadir propiedad</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => {
            const occ = occupancy.get(prop.id) ?? { total: 0, occupied: 0 }
            const estado = occupancyStatus(occ.total, occ.occupied)
            return (
              <Link key={prop.id} to={`/propiedades/${prop.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink-900">{prop.name}</h3>
                    <Badge tone={estado.tone}>{estado.label}</Badge>
                  </div>
                  {prop.address && (
                    <p className="mt-1 text-sm text-gray-500">{prop.address}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>🛏 {prop.bedrooms} hab.</span>
                    <span>🚿 {prop.bathrooms} baños</span>
                    <span>
                      {prop.rental_type === 'habitaciones'
                        ? '🔑 Por habitaciones'
                        : '🔑 Completa'}
                    </span>
                  </div>
                  <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
                    {prop.rental_type === 'habitaciones' ? (
                      <span className="text-gray-600">
                        {occ.occupied} de {occ.total} habitaciones ocupadas
                      </span>
                    ) : (
                      <span className="font-medium text-ink-900">
                        {formatMoney(prop.monthly_rent)}
                        <span className="font-normal text-gray-500"> / mes</span>
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <NewPropertyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          void load()
        }}
      />
    </div>
  )
}

function occupancyStatus(total: number, occupied: number) {
  if (total === 0) return { label: 'Sin habitaciones', tone: 'gray' as const }
  if (occupied === 0) return { label: 'Libre', tone: 'blue' as const }
  if (occupied === total) return { label: 'Ocupada', tone: 'green' as const }
  return { label: 'Parcial', tone: 'amber' as const }
}

function NewPropertyModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [rentalType, setRentalType] = useState<RentalType>('completa')
  const [bedrooms, setBedrooms] = useState('0')
  const [bathrooms, setBathrooms] = useState('0')
  const [rent, setRent] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function reset() {
    setName('')
    setAddress('')
    setRentalType('completa')
    setBedrooms('0')
    setBathrooms('0')
    setRent('')
    setNotes('')
    setErr(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await createProperty({
        name: name.trim(),
        address: address.trim() || null,
        rental_type: rentalType,
        bedrooms: Number(bedrooms) || 0,
        bathrooms: Number(bathrooms) || 0,
        monthly_rent: rentalType === 'completa' && rent ? Number(rent) : null,
        notes: notes.trim() || null,
      })
      reset()
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
      title="Nueva propiedad"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="form-propiedad" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-propiedad" onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Piso Calle Mayor 12"
          />
        </Field>
        <Field label="Dirección">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, número, ciudad"
          />
        </Field>
        <Field label="Tipo de alquiler">
          <Select
            value={rentalType}
            onChange={(e) => setRentalType(e.target.value as RentalType)}
          >
            <option value="completa">Completa (todo el piso a un inquilino)</option>
            <option value="habitaciones">Por habitaciones</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Habitaciones">
            <Input
              type="number"
              min={0}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            />
          </Field>
          <Field label="Baños">
            <Input
              type="number"
              min={0}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
            />
          </Field>
        </div>
        {rentalType === 'completa' && (
          <Field label="Alquiler mensual (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="Ej. 800"
            />
          </Field>
        )}
        <Field label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cualquier detalle que quieras recordar"
          />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  )
}
