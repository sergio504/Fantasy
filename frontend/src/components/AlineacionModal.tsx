import { useEffect, useState } from 'react'
import { getHistorialMiembro } from '../api/ligas'
import JugadorModal from './JugadorModal'

interface JugadorSnap {
  jugadorId: string
  jugador: { nombre: string; nombreCompleto: string; posicion: string }
  equipo: string
  esCapitan: boolean
  puntos: number | null
}

interface JornadaHistorial {
  jornada: { id: string; numJornada: number; fechaInicioJornada: string | null }
  totalPuntos: number | null
  jugadores: JugadorSnap[]
}

interface Props {
  ligaId: string
  miembroId: string
  username: string
  onClose: () => void
}

const POS_STYLE: Record<string, { label: string; color: string }> = {
  PORTERO:        { label: 'POR', color: 'bg-yellow-100 text-yellow-700' },
  DEFENSA:        { label: 'DEF', color: 'bg-blue-100 text-blue-700'    },
  CENTROCAMPISTA: { label: 'CEN', color: 'bg-purple-100 text-purple-700' },
  DELANTERO:      { label: 'DEL', color: 'bg-red-100 text-red-700'       },
  UNKNOWN:        { label: '?',   color: 'bg-gray-100 text-gray-500'     },
}

const POS_LABEL: Record<string, string> = {
  PORTERO: 'Portero', DEFENSA: 'Defensas',
  CENTROCAMPISTA: 'Centrocampistas', DELANTERO: 'Delanteros',
}

export default function AlineacionModal({ ligaId, miembroId, username, onClose }: Props) {
  const [historial, setHistorial] = useState<JornadaHistorial[]>([])
  const [idx, setIdx]             = useState(0)
  const [loading, setLoading]     = useState(true)
  const [modalJugador, setModalJugador] = useState<{ id: string; nombre: string; posicion: string; equipo: string } | null>(null)

  useEffect(() => {
    getHistorialMiembro(ligaId, miembroId)
      .then(r => setHistorial(r.data))
      .finally(() => setLoading(false))

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setIdx(i => Math.min(i + 1, historial.length - 1))
      if (e.key === 'ArrowRight') setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ligaId, miembroId])

  const jornada = historial[idx]
  const total   = historial.length

  // Agrupar jugadores por posición
  const grupos = jornada ? (['PORTERO', 'DEFENSA', 'CENTROCAMPISTA', 'DELANTERO'] as const).map(pos => ({
    pos,
    jugadores: jornada.jugadores.filter(j => j.jugador.posicion === pos),
  })).filter(g => g.jugadores.length > 0) : []

  return (
    <>
    {modalJugador && (
      <JugadorModal
        jugadorId={modalJugador.id}
        nombre={modalJugador.nombre}
        posicion={modalJugador.posicion}
        equipo={modalJugador.equipo}
        ligaId={ligaId}
        onClose={() => setModalJugador(null)}
      />
    )}
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium">Alineación de</p>
            <h2 className="text-base font-bold text-gray-900">{username}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Navegación de jornadas */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/60">
            <button
              onClick={() => setIdx(i => Math.min(i + 1, total - 1))}
              disabled={idx >= total - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-bold"
            >
              ‹
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">
                Jornada {jornada?.jornada.numJornada}
              </p>
              <p className="text-xs text-gray-400">
                {idx + 1} de {total}
              </p>
            </div>

            <button
              onClick={() => setIdx(i => Math.max(i - 1, 0))}
              disabled={idx <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-bold"
            >
              ›
            </button>
          </div>
        )}

        {/* Contenido */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-12">Cargando...</p>
          ) : total === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">Sin alineaciones registradas</p>
          ) : (
            <>
              {/* Total de puntos */}
              <div className="flex items-center justify-between px-5 py-3 bg-indigo-50/50">
                <span className="text-xs font-medium text-gray-500">Total jornada</span>
                <span className={`text-lg font-extrabold ${
                  (jornada.totalPuntos ?? 0) >= 30 ? 'text-green-600'
                  : (jornada.totalPuntos ?? 0) >= 15 ? 'text-indigo-600'
                  : 'text-gray-800'
                }`}>
                  {jornada.totalPuntos ?? '—'} pts
                </span>
              </div>

              {/* Jugadores agrupados por posición */}
              {grupos.map(({ pos, jugadores }) => (
                <div key={pos}>
                  <p className="px-5 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/80">
                    {POS_LABEL[pos] ?? pos}
                  </p>
                  {jugadores.map((jj, i) => {
                    const ps = POS_STYLE[jj.jugador.posicion] ?? POS_STYLE.UNKNOWN
                    return (
                      <button
                        key={i}
                        onClick={() => setModalJugador({ id: jj.jugadorId, nombre: jj.jugador.nombre, posicion: jj.jugador.posicion, equipo: jj.equipo })}
                        className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-lg font-bold ${ps.color}`}>
                          {ps.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium truncate">
                            {jj.jugador.nombre}
                            {jj.esCapitan && (
                              <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">C</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{jj.equipo}</p>
                        </div>
                        <span className={`shrink-0 text-sm font-bold w-12 text-right ${
                          jj.puntos === null ? 'text-gray-300'
                          : jj.puntos >= 8   ? 'text-green-600'
                          : jj.puntos >= 4   ? 'text-indigo-600'
                          : jj.puntos > 0    ? 'text-gray-700'
                          : 'text-red-500'
                        }`}>
                          {jj.puntos !== null ? `${jj.puntos}p` : '—'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
