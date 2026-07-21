import { supabase } from '../lib/supabase'
import type {
  Expense,
  Payment,
  Property,
  Room,
  Tenant,
  UtilityBill,
  UtilityShare,
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

/* =========================================================
   SERVICIOS (agua, luz…) con reparto entre inquilinos
   ========================================================= */
export async function listUtilityBills(): Promise<UtilityBill[]> {
  const { data, error } = await supabase
    .from('utility_bills')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listUtilityShares(): Promise<UtilityShare[]> {
  const { data, error } = await supabase.from('utility_shares').select('*')
  if (error) throw error
  return data
}

export async function createUtilityBill(
  values: Partial<UtilityBill> & { property_id: string },
): Promise<UtilityBill> {
  const { data, error } = await supabase
    .from('utility_bills')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addUtilityShares(
  shares: Partial<UtilityShare>[],
): Promise<void> {
  if (shares.length === 0) return
  const { error } = await supabase.from('utility_shares').insert(shares)
  if (error) throw error
}

export async function updateUtilityShare(
  id: string,
  values: Partial<UtilityShare>,
): Promise<UtilityShare> {
  const { data, error } = await supabase
    .from('utility_shares')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteUtilityBill(id: string): Promise<void> {
  const { error } = await supabase.from('utility_bills').delete().eq('id', id)
  if (error) throw error
}

/* ---------- Almacenamiento de fotos de recibos (bucket privado) ---------- */
export async function uploadReceipt(file: File, userId: string): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('recibos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

// Genera una URL temporal (1 hora) para ver una foto privada de un recibo.
export async function receiptSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('recibos')
    .createSignedUrl(path, 60 * 60)
  if (error) return null
  return data.signedUrl
}

/* =========================================================
   GASTOS por propiedad
   ========================================================= */
export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function createExpense(values: Partial<Expense>): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(values).select().single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
