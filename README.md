# Gestión de Propiedades

Aplicación web para gestionar propiedades en alquiler (pisos y habitaciones):
inquilinos, cobros y pagos, todo en un solo lugar.

## Estado actual — Etapa 1

- ✅ Propiedades (alquiler completo o por habitaciones) con estado de ocupación
- ✅ Habitaciones por propiedad (área, precio, quién vive)
- ✅ Ficha de inquilinos (contacto, fecha de entrada, notas, asignación a piso/habitación)
- ✅ Control de pagos (registro de cobros, pagos parciales, resumen mensual)
- ✅ Panel de resumen (dashboard) con cobrado/pendiente del mes y pagos pendientes
- ✅ Acceso con usuario y contraseña; cada cuenta ve solo sus datos

Pendiente (siguientes etapas): contratos en PDF, subida de fotos de DNI y
comprobantes, gastos, reparaciones, informes y avisos por email.

## Tecnología

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth), con Row Level Security por usuario

## Cómo ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:5173 y crea tu cuenta en la pantalla de acceso.

Las claves de Supabase están en `.env.local` (no se sube al control de versiones).
Usa `.env.example` como plantilla si necesitas recrearlo.

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` — compilar para producción
- `npm run preview` — previsualizar la compilación
- `npm run typecheck` — comprobar tipos

## Estructura

```
src/
  components/   Layout, componentes de interfaz reutilizables (ui.tsx)
  context/      AuthContext (sesión de usuario)
  data/         api.ts — todas las operaciones con la base de datos
  lib/          supabase.ts, types.ts, format.ts
  pages/        Login, Dashboard, Properties, PropertyDetail, Tenants, Payments
```
