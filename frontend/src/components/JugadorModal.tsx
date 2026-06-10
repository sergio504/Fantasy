import { useEffect, useState } from 'react'
import { getEstadisticasJugador } from '../api/ligas'

interface Desglose {
  convocado?: number
  titular?: number
  minutos60?: number
  goles?: { cantidad: number; puntosUnitarios: number; total: number }
  tarjetasAmarillas?: { cantidad: number; puntosUnitarios: number; total: number }
  tarjetaRoja?: number
  resultado?: { tipo: string; puntos: number }
}

interface EstadisticaJornada {
  id: string
  convocado: boolean; titular: boolean; minutosJugados: number
  goles: number; tarjetasAmarillas: number; tarjetaRoja: boolean
  resultado: string; puntosCalculados: number; desglose: Desglose | null
  jornada: { numJornada: number; division: string; fechaCierre: string }
  propietario: string | null
}

interface Props {
  jugadorId: string
  nombreCompleto: string
  posicion: string
  equipo?: string
  ligaId?: string
  onClose: () => void
}

const RES_LABEL: Record<string, string> = { VICTORIA: 'Victoria', EMPATE: 'Empate', DERROTA: 'Derrota' }
const RES_COLOR: Record<string, string> = { VICTORIA: 'text-green-600', EMPATE: 'text-yellow-600', DERROTA: 'text-red-500' }

function lineaDesglose(label: string, puntos: number, extra = '') {
  const color = puntos > 0 ? 'text-green-700' : puntos < 0 ? 'text-red-600' : 'text-gray-400'
  const signo = puntos > 0 ? '+' : ''
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-600">{label}{extra}</span>
      <span className={`font-semibold ${color}`}>{signo}{puntos}</span>
    </div>
  )
}

function Desglose({ d: raw, e, esCapitan }: { d: Desglose | null; e: EstadisticaJornada; esCapitan?: boolean }) {
  const d: Desglose | null = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!d) {
    // Fallback con datos crudos cuando no hay desglose JSON
    return (
      <div className="space-y-0.5">
        <div className="text-xs text-gray-400 italic pb-1">
          {e.convocado ? (e.titular ? `Titular (${e.minutosJugados}')` : 'Convocado') : 'No convocado'}
          {e.goles > 0 && ` · ${e.goles} gol${e.goles > 1 ? 'es' : ''}`}
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
          <span className="text-gray-500 font-medium">Total</span>
          <span className="font-bold text-gray-800">{e.puntosCalculados} pts</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {!e.convocado && (
        <div className="text-xs text-gray-400 italic pb-0.5">No convocado</div>
      )}
      {d.convocado !== undefined  && lineaDesglose('Convocado para el partido', d.convocado)}
      {d.titular   !== undefined  && lineaDesglose(`Titular${e.minutosJugados ? ` (${e.minutosJugados}')` : ''}`, d.titular)}
      {d.minutos60 !== undefined  && lineaDesglose('Jugó más de 60 minutos', d.minutos60)}
      {d.goles                    && lineaDesglose(`Gol${d.goles.cantidad > 1 ? 'es' : ''} (×${d.goles.cantidad})`, d.goles.total)}
      {d.tarjetasAmarillas        && lineaDesglose(`Tarjeta${d.tarjetasAmarillas.cantidad > 1 ? 's' : ''} amarilla${d.tarjetasAmarillas.cantidad > 1 ? 's' : ''} (×${d.tarjetasAmarillas.cantidad})`, d.tarjetasAmarillas.total)}
      {d.tarjetaRoja !== undefined && lineaDesglose('Tarjeta roja', d.tarjetaRoja)}
      {d.resultado                && lineaDesglose(
        d.resultado.tipo === 'VICTORIA' ? 'Victoria del equipo'
        : d.resultado.tipo === 'EMPATE' ? 'Empate del equipo'
        : 'Derrota del equipo',
        d.resultado.puntos,
      )}
      <div className="flex justify-between text-xs pt-1.5 border-t border-gray-100 mt-0.5">
        <span className="text-gray-500 font-medium">Total jornada</span>
        <span className="font-bold text-gray-800">{e.puntosCalculados} pts</span>
      </div>
      {esCapitan && (
        <div className="flex justify-between text-xs">
          <span className="text-amber-600 font-medium">× 2 (capitán)</span>
          <span className="font-bold text-amber-600">{e.puntosCalculados * 2} pts</span>
        </div>
      )}
    </div>
  )
}

export default function JugadorModal({ jugadorId, nombreCompleto, posicion, equipo, ligaId, onClose }: Props) {
  const [estadisticas, setEstadisticas] = useState<EstadisticaJornada[]>([])
  const [loading, setLoading] = useState(true)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  useEffect(() => {
    getEstadisticasJugador(jugadorId, ligaId)
      .then(r => {
        const ordenadas = [...r.data].sort((a, b) => b.jornada.numJornada - a.jornada.numJornada)
        setEstadisticas(ordenadas)
      })
      .finally(() => setLoading(false))

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jugadorId])

  const totalPuntos = estadisticas.reduce((sum, e) => sum + e.puntosCalculados, 0)

  function toggleJornada(id: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">{nombreCompleto}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {posicion}{equipo ? ` · ${equipo}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {estadisticas.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total acumulado</p>
                  <p className="text-lg font-extrabold text-indigo-600">{totalPuntos} pts</p>
                </div>
              )}
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Estadísticas agregadas */}
          {estadisticas.length > 0 && (() => {
            const convocados    = estadisticas.filter(e => e.convocado).length
            const titulares     = estadisticas.filter(e => e.titular).length
            const mas60         = estadisticas.filter(e => e.minutosJugados > 60).length
            const goles         = estadisticas.reduce((s, e) => s + e.goles, 0)
            const amarillas     = estadisticas.reduce((s, e) => s + e.tarjetasAmarillas, 0)
            const rojas         = estadisticas.filter(e => e.tarjetaRoja).length
            const victorias     = estadisticas.filter(e => e.resultado === 'VICTORIA').length

            const stat = (label: string, val: number, color = 'text-gray-900') => (
              <div className="flex flex-col items-center">
                <span className={`text-sm font-bold ${color}`}>{val}</span>
                <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
              </div>
            )

            return (
              <div className="grid grid-cols-4 gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                {stat('Convocado', convocados)}
                {stat('Titular', titulares)}
                {stat('>60 min', mas60)}
                {stat('Victorias', victorias, victorias > 0 ? 'text-green-600' : 'text-gray-900')}
                {stat('Goles', goles, goles > 0 ? 'text-green-600' : 'text-gray-900')}
                {stat('Amarillas', amarillas, amarillas > 0 ? 'text-yellow-500' : 'text-gray-900')}
                {stat('Rojas', rojas, rojas > 0 ? 'text-red-500' : 'text-gray-900')}
                {stat('Jornadas', estadisticas.length)}
              </div>
            )
          })()}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
          ) : estadisticas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Sin estadísticas disponibles</p>
          ) : (
            estadisticas.map(e => {
              const abierto = abiertos.has(e.id)
              return (
                <div key={e.id} className="bg-gray-50 rounded-xl overflow-hidden">
                  {/* Fila colapsada — siempre visible */}
                  <button
                    onClick={() => toggleJornada(e.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-left">
                      <span className="text-sm font-semibold text-gray-900">Jornada {e.jornada.numJornada}</span>
                      {ligaId && (
                        <span className={`ml-2 text-xs font-medium ${e.propietario ? 'text-indigo-500' : 'text-gray-400'}`}>
                          {e.propietario ?? 'Libre'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-extrabold ${
                        e.puntosCalculados >= 8 ? 'text-green-600'
                        : e.puntosCalculados >= 4 ? 'text-indigo-600'
                        : e.puntosCalculados > 0 ? 'text-gray-700'
                        : 'text-red-500'
                      }`}>
                        {e.puntosCalculados} pts
                      </span>
                      <span className="text-gray-400 text-xs">{abierto ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Desglose expandible */}
                  {abierto && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                      <Desglose d={e.desglose as Desglose | null} e={e} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
