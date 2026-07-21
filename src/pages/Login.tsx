import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button, Field, Input } from '../components/ui'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'entrar' | 'crear'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const fn = mode === 'entrar' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setLoading(false)
    if (error) {
      setError(error)
    } else if (mode === 'crear') {
      setInfo('Cuenta creada. Ya puedes iniciar sesión.')
      setMode('entrar')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-ink-900">
            RP
          </span>
          <h1 className="mt-4 text-2xl font-bold text-white">Gestión de Propiedades</h1>
          <p className="mt-1 text-sm text-brand-200">
            {mode === 'entrar' ? 'Entra a tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-xl"
        >
          <Field label="Correo electrónico">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </Field>
          <Field label="Contraseña" hint="Mínimo 6 caracteres">
            <Input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {info && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Un momento…' : mode === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-gray-500">
            {mode === 'entrar' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'entrar' ? 'crear' : 'entrar')
                setError(null)
                setInfo(null)
              }}
              className="font-medium text-brand-600 hover:underline"
            >
              {mode === 'entrar' ? 'Crear una' : 'Entrar'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
