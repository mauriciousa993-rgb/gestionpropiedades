import { supabase } from '../lib/supabase'
import type {
  Payment,
  Property,
  Room,
  Tenant,
} from '../lib/types'

/* =========================================================
   PROPIEDADES
   ========================================================= */
export async function listProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProperty(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProperty(
  values: Partial<Property> & { name: string },
): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProperty(
  id: string,
  values: Partial<Property>,
): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   HABITACIONES
   ========================================================= */
export async function listRooms(propertyId?: string): Promise<Room[]> {
  let q = supabase.from('rooms').select('*').order('created_at', { ascending: true })
  if (propertyId) q = q.eq('property_id', propertyId)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createRoom(
  values: Partial<Room> & { property_id: string; name: string },
): Promise<Room> {
  const { data, error } = await supabase.from('rooms').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateRoom(id: string, values: Partial<Room>): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   INQUILINOS
   ========================================================= */
export async function listTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTenant(
  values: Partial<Tenant> & { full_name: string },
): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateTenant(id: string, values: Partial<Tenant>): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase.from('tenants').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   PAGOS
   ========================================================= */
export async function listPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('due_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function listPaymentsByTenant(tenantId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function createPayment(values: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase.from('payments').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updatePayment(id: string, values: Partial<Payment>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}
