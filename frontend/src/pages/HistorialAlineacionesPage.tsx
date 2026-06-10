import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getHistorialAlineaciones } from '../api/ligas'
import Spinner from '../components/Spinner'

interface Desglose {
  convocado?: number
  titular?: number
  minutos60?: number
  goles?: { cantidad: number; puntosUnitarios: number; total: number }
  tarjetasAmarillas?: { cantidad: number; puntosUnitarios: number; total: number }
  tarjetaRoja?: number
  resultado?: { tipo: string; puntos: number }
}

interface Estadistica {
  convocado: boolean; titular: boolean; minutosJugados: number
  goles: number; tarjetasAmarillas: number; tarjetaRoja: boolean
  resultado: string; desglose: Desglose | null
}

interface JugadorJornada {
  jugador: { nombreCompleto: string; nombre: string; posicion: string }
  esCapitan: boolean
  estadistica: Estadistica | null
  puntos: number | null
}

interface JornadaHistorial {
  jornada: { id: string; numJornada: number; fechaCierre: string }
  totalPuntos: number | null
  jugadores: JugadorJornada[]
}

const POS_STYLE: Record<string, { label: string; color: string }> = {
  PORTERO:        { label: 'POR', color: 'bg-yellow-100 text-yellow-700' },
  DEFENSA:        { label: 'DEF', color: 'bg-blue-100 text-blue-700'    },
  CENTROCAMPISTA: { label: 'CEN', color: 'bg-purple-100 text-purple-700' },
  DELANTERO:      { label: 'DEL', color: 'bg-red-100 text-red-700'       },
  UNKNOWN:        { label: '?',   color: 'bg-gray-100 text-gray-500'     },
}

const RES_STYLE: Record<string, string> = {
  VICTORIA: 'text-green-600',
  EMPATE:   'text-yellow-600',
  DERROTA:  'text-red-500',
}

function resumenDesglose(d: Desglose | null, esCapitan: boolean): string {
  if (!d) return '—'
  const partes: string[] = []
  if (d.titular) partes.push('Titular')
  else if (d.convocado) partes.push('Convocado')
  if (d.goles) partes.push(`${d.goles.cantidad} gol${d.goles.cantidad > 1 ? 'es' : ''}`)
  if (d.tarjetasAmarillas) partes.push('Amarilla')
  if (d.tarjetaRoja) partes.push('Roja')
  if (d.resultado) partes.push(d.resultado.tipo === 'VICTORIA' ? 'Victoria' : d.resultado.tipo === 'EMPATE' ? 'Empate' : 'Derrota')
  if (esCapitan) partes.push('×2 capitán')
  return partes.join(' · ') || '—'
}

export default function HistorialAlineacionesPage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const [historial, setHistorial] = useState<JornadaHistorial[]>([])
  const [loading, setLoading] = useState(true)
  const [jornadaAbierta, setJornadaAbierta] = useState<string | null>(null)

  useEffect(() => {
    if (!ligaId) return
    getHistorialAlineaciones(ligaId)
      .then(r => {
        setHistorial(r.data)
        if (r.data.length > 0) setJornadaAbierta(r.data[0].jornada.id)
      })
      .finally(() => setLoading(false))
  }, [ligaId])

  if (loading) return <Spinner />

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`/ligas/${ligaId}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
        ← Volver a la liga
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historial de alineaciones</h1>

      {historial.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-4">📅</span>
          <p className="text-gray-500 font-medium">Aún no hay jornadas cerradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {historial.map(({ jornada, totalPuntos, jugadores }) => {
            const abierta = jornadaAbierta === jornada.id
            return (
              <div key={jornada.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Cabecera de jornada */}
                <button
                  onClick={() => setJornadaAbierta(abierta ? null : jornada.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">Jornada {jornada.numJornada}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(jornada.fechaCierre).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalPuntos !== null && (
                      <span className={`text-lg font-extrabold ${totalPuntos >= 30 ? 'text-green-600' : totalPuntos >= 15 ? 'text-indigo-600' : 'text-gray-700'}`}>
                        {totalPuntos} pts
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">{abierta ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Detalle de jugadores */}
                {abierta && (
                  <div className="border-t border-gray-50 divide-y divide-gray-50">
                    {jugadores.map((jj, i) => {
                      const ps = POS_STYLE[jj.jugador.posicion] ?? POS_STYLE.UNKNOWN
                      const d = jj.estadistica?.desglose ?? null
                      const resumen = resumenDesglose(d, jj.esCapitan)
                      const resultado = jj.estadistica?.resultado ?? null

                      return (
                        <div key={i} className="flex items-center px-5 py-3 gap-3">
                          <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold ${ps.color}`}>
                            {ps.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 truncate">{jj.jugador.nombre}</p>
                              {jj.esCapitan && (
                                <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">C</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{resumen}</p>
                          </div>
                          {resultado && (
                            <span className={`shrink-0 text-xs font-semibold ${RES_STYLE[resultado] ?? ''}`}>
                              {resultado === 'VICTORIA' ? 'V' : resultado === 'EMPATE' ? 'E' : 'D'}
                            </span>
                          )}
                          <span className={`shrink-0 text-sm font-bold w-12 text-right ${
                            jj.puntos === null ? 'text-gray-300'
                            : jj.puntos >= 8 ? 'text-green-600'
                            : jj.puntos >= 4 ? 'text-indigo-600'
                            : jj.puntos > 0 ? 'text-gray-700'
                            : 'text-red-500'
                          }`}>
                            {jj.puntos !== null ? `${jj.puntos} pts` : '—'}
                          </span>
                        </div>
                      )
                    })}

                    {/* Total */}
                    {totalPuntos !== null && (
                      <div className="flex justify-between items-center px-5 py-3 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-700">Total jornada {jornada.numJornada}</p>
                        <p className="text-base font-extrabold text-gray-900">{totalPuntos} pts</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
