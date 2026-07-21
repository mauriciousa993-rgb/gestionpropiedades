// Tipos de datos que reflejan el esquema de la base de datos (Etapa 1).

export type RentalType = 'completa' | 'habitaciones'
export type TenantStatus = 'activo' | 'inactivo'
export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado'

export interface Property {
  id: string
  owner_id: string
  name: string
  address: string | null
  rental_type: RentalType
  bedrooms: number
  bathrooms: number
  monthly_rent: number | null
  notes: string | null
  created_at: string
}

export interface Room {
  id: string
  owner_id: string
  property_id: string
  name: string
  area_m2: number | null
  monthly_rent: number | null
  created_at: string
}

export interface Tenant {
  id: string
  owner_id: string
  full_name: string
  phone: string | null
  email: string | null
  move_in_date: string | null
  id_document_url: string | null
  notes: string | null
  property_id: string | null
  room_id: string | null
  status: TenantStatus
  created_at: string
}

export interface Payment {
  id: string
  owner_id: string
  tenant_id: string | null
  property_id: string | null
  room_id: string | null
  period: string | null
  due_date: string | null
  amount_due: number
  amount_paid: number
  paid_date: string | null
  status: PaymentStatus
  receipt_url: string | null
  notes: string | null
  created_at: string
}

// Tipos para inserción (los campos con default en la BD son opcionales).
export type PropertyInsert = Omit<Property, 'id' | 'owner_id' | 'created_at'>
export type RoomInsert = Omit<Room, 'id' | 'owner_id' | 'created_at'>
export type TenantInsert = Omit<Tenant, 'id' | 'owner_id' | 'created_at'>
export type PaymentInsert = Omit<Payment, 'id' | 'owner_id' | 'created_at'>
