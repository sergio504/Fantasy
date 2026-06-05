import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLiga } from '../api/ligas'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { DIVISION_LABEL, DIVISION_STYLE } from '../constants/divisiones'

interface Miembro {
  id: string
  usuarioId: string
  puntuacion: number
  presupuestoRestante: number
  usuario: { id: string; username: string }
}

interface Liga {
  id: string
  nombre: string
  division: string
  publica: boolean
  codigoInvitacion: string | null
  maxEquipos: number
  presupuestoInicial: number
  creadorId: string
  miembros: Miembro[]
}


const MEDAL = ['🥇', '🥈', '🥉']

export default function LigaDetallePage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const { usuario } = useAuth()
  const [liga, setLiga] = useState<Liga | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!ligaId) return
    getLiga(ligaId)
      .then(r => setLiga(r.data))
      .catch(() => setError('No se pudo cargar la liga'))
      .finally(() => setLoading(false))
  }, [ligaId])

  const copiarCodigo = () => {
    if (!liga?.codigoInvitacion) return
    navigator.clipboard.writeText(liga.codigoInvitacion)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (loading) return <Spinner />
  if (error || !liga) return <p className="text-center text-gray-400 py-16">{error || 'Liga no encontrada'}</p>

  const d = DIVISION_STYLE[liga.division] ?? DIVISION_STYLE.RFEF3_GRUPO_IV
  const miMiembro = liga.miembros.find(m => m.usuarioId === usuario?.id)

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero de liga */}
      <div className={`bg-linear-to-br ${d.bg} via-white to-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{liga.nombre}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.badge}`}>
                {DIVISION_LABEL[liga.division] ?? liga.division}
              </span>
              {!liga.publica && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  🔒 Privada
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {liga.miembros.length}/{liga.maxEquipos} equipos · {liga.presupuestoInicial}M iniciales
            </p>
          </div>
          {!liga.publica && liga.codigoInvitacion && (
            <button
              onClick={copiarCodigo}
              className="shrink-0 flex items-center gap-2 text-xs bg-white border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
            >
              <span className="font-mono font-bold text-indigo-600">{liga.codigoInvitacion}</span>
              <span className={copiado ? 'text-green-500' : 'text-gray-400'}>
                {copiado ? '✓' : '📋'}
              </span>
            </button>
          )}
        </div>

        {/* Mi estado */}
        {miMiembro && (
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Mi presupuesto</p>
              <p className="font-bold text-gray-900">{miMiembro.presupuestoRestante}M</p>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Mis puntos</p>
              <p className="font-bold text-gray-900">{miMiembro.puntuacion} pts</p>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Mi posición</p>
              <p className="font-bold text-gray-900">
                {liga.miembros.findIndex(m => m.usuarioId === usuario?.id) + 1}º
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          to={`/ligas/${ligaId}/jugadores`}
          className="flex-1 sm:flex-none text-center text-sm px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200"
        >
          👕 Mis jugadores
        </Link>
        <Link
          to={`/ligas/${ligaId}/mercado`}
          className="flex-1 sm:flex-none text-center text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
        >
          💰 Mercado
        </Link>
        <Link
          to={`/ligas/${ligaId}/transferencias`}
          className="flex-1 sm:flex-none text-center text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
        >
          📋 Transferencias
        </Link>
        <Link
          to={`/ligas/${ligaId}/historial`}
          className="flex-1 sm:flex-none text-center text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
        >
          📅 Alineaciones
        </Link>
      </div>

      {/* Clasificación */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Clasificación</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {liga.miembros.map((m, i) => {
            const esTuyo = m.usuarioId === usuario?.id
            return (
              <div
                key={m.id}
                className={`flex items-center px-5 py-3.5 gap-3 ${esTuyo ? 'bg-indigo-50/50' : ''}`}
              >
                <span className="text-base w-6 text-center">
                  {i < 3 ? MEDAL[i] : <span className="text-sm font-bold text-gray-400">{i + 1}</span>}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {m.usuario.username}
                  {m.usuarioId === liga.creadorId && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">creador</span>
                  )}
                  {esTuyo && (
                    <span className="ml-2 text-xs text-indigo-500 font-semibold">tú</span>
                  )}
                </span>
                {esTuyo && (
                  <span className="text-xs text-gray-400">{(m as any).presupuestoRestante}M</span>
                )}
                <span className="text-sm font-bold text-gray-900 w-16 text-right">
                  {m.puntuacion} pts
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
