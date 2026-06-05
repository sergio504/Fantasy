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
}

interface Props {
  jugadorId: string
  nombreCompleto: string
  posicion: string
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

function Desglose({ d, puntosBase, esCapitan }: { d: Desglose | null; puntosBase: number; esCapitan?: boolean }) {
  if (!d) return <p className="text-xs text-gray-400 italic">Sin desglose disponible</p>
  return (
    <div className="space-y-0.5">
      {d.convocado !== undefined && lineaDesglose('Convocado', d.convocado)}
      {d.titular   !== undefined && lineaDesglose('Titular', d.titular)}
      {d.minutos60 !== undefined && lineaDesglose('>60 min', d.minutos60)}
      {d.goles && lineaDesglose(`Gol${d.goles.cantidad > 1 ? 'es' : ''} (×${d.goles.cantidad})`, d.goles.total)}
      {d.tarjetasAmarillas && lineaDesglose(`Amarilla${d.tarjetasAmarillas.cantidad > 1 ? 's' : ''} (×${d.tarjetasAmarillas.cantidad})`, d.tarjetasAmarillas.total)}
      {d.tarjetaRoja !== undefined && lineaDesglose('Tarjeta roja', d.tarjetaRoja)}
      {d.resultado && lineaDesglose(RES_LABEL[d.resultado.tipo] ?? d.resultado.tipo, d.resultado.puntos)}
      <div className="flex justify-between text-xs pt-1 border-t border-gray-100 mt-1">
        <span className="text-gray-500 font-medium">Subtotal</span>
        <span className="font-bold text-gray-800">{puntosBase} pts</span>
      </div>
      {esCapitan && (
        <div className="flex justify-between text-xs">
          <span className="text-amber-600 font-medium">× 2 (capitán)</span>
          <span className="font-bold text-amber-600">{puntosBase * 2} pts</span>
        </div>
      )}
    </div>
  )
}

export default function JugadorModal({ jugadorId, nombreCompleto, posicion, onClose }: Props) {
  const [estadisticas, setEstadisticas] = useState<EstadisticaJornada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEstadisticasJugador(jugadorId)
      .then(r => setEstadisticas(r.data))
      .finally(() => setLoading(false))

    // Cerrar con Escape
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jugadorId])

  const totalPuntos = estadisticas.reduce((sum, e) => sum + e.puntosCalculados, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">{nombreCompleto}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{posicion}</p>
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

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
          ) : estadisticas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Sin estadísticas disponibles</p>
          ) : (
            estadisticas.map(e => (
              <div key={e.id} className="bg-gray-50 rounded-xl p-4">
                {/* Jornada header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-bold text-gray-900">Jornada {e.jornada.numJornada}</span>
                    <span className={`ml-2 text-xs font-semibold ${RES_COLOR[e.resultado] ?? ''}`}>
                      {RES_LABEL[e.resultado] ?? e.resultado}
                    </span>
                  </div>
                  <span className={`text-sm font-extrabold ${
                    e.puntosCalculados >= 8 ? 'text-green-600'
                    : e.puntosCalculados >= 4 ? 'text-indigo-600'
                    : e.puntosCalculados > 0 ? 'text-gray-700'
                    : 'text-red-500'
                  }`}>
                    {e.puntosCalculados} pts
                  </span>
                </div>

                {/* Stats rápidas */}
                <div className="flex gap-3 text-xs text-gray-500 mb-3">
                  <span>{e.convocado ? (e.titular ? `Titular · ${e.minutosJugados}'` : 'Convocado') : 'No convocado'}</span>
                  {e.goles > 0 && <span className="text-green-600 font-semibold">⚽ {e.goles}</span>}
                  {e.tarjetasAmarillas > 0 && <span className="text-yellow-500 font-semibold">🟨 {e.tarjetasAmarillas}</span>}
                  {e.tarjetaRoja && <span className="text-red-500 font-semibold">🟥</span>}
                </div>

                {/* Desglose */}
                <Desglose d={e.desglose as Desglose | null} puntosBase={e.puntosCalculados} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
