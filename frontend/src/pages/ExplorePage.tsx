import { useEffect, useState } from 'react'
import { getRankings } from '../api/explorar'
import Spinner from '../components/Spinner'
import JugadorModal from '../components/JugadorModal'
import AlineacionModal from '../components/AlineacionModal'
import { DIVISION_LABEL, DIVISION_STYLE, DIVISIONES } from '../constants/divisiones'

const POSICION_LABEL: Record<string, string> = {
  PORTERO: 'POR',
  DEFENSA: 'DEF',
  CENTROCAMPISTA: 'CEN',
  DELANTERO: 'DEL',
  UNKNOWN: '?',
}

interface JugadorRanking {
  jugadorId: string
  nombre: string
  posicion: string
  valor: number
  equipoNombre: string
  totalPuntos?: string | null
}

interface UsuarioRanking {
  usuarioId: string
  username: string
  puntuacion: number
  miembroLigaId: string
  ligaId: string
  ligaNombre: string
}

interface Rankings {
  jugadoresPorPuntos: JugadorRanking[]
  jugadoresPorValor: JugadorRanking[]
  usuariosPorPuntos: UsuarioRanking[]
}

interface ModalJugador {
  id: string
  nombre: string
  posicion: string
  equipo: string
}

interface ModalUsuario {
  ligaId: string
  miembroId: string
  username: string
}

export default function ExplorePage() {
  const [division, setDivision] = useState(DIVISIONES[0])
  const [rankings, setRankings] = useState<Rankings | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [modalJugador, setModalJugador] = useState<ModalJugador | null>(null)
  const [modalUsuario, setModalUsuario] = useState<ModalUsuario | null>(null)

  useEffect(() => {
    setLoading(true)
    setRankings(null)
    setFetchError(false)
    getRankings(division)
      .then(r => setRankings(r.data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [division])

  const d = DIVISION_STYLE[division] ?? DIVISION_STYLE.RFEF3_GRUPO_IV

  return (
    <>
      {modalJugador && (
        <JugadorModal
          jugadorId={modalJugador.id}
          nombre={modalJugador.nombre}
          posicion={modalJugador.posicion}
          equipo={modalJugador.equipo}
          onClose={() => setModalJugador(null)}
        />
      )}
      {modalUsuario && (
        <AlineacionModal
          ligaId={modalUsuario.ligaId}
          miembroId={modalUsuario.miembroId}
          username={modalUsuario.username}
          onClose={() => setModalUsuario(null)}
        />
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Explorar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rankings por división</p>
        </div>

        {/* Selector de división */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {DIVISIONES.map(div => {
            const style = DIVISION_STYLE[div] ?? DIVISION_STYLE.RFEF3_GRUPO_IV
            const activo = div === division
            return (
              <button
                key={div}
                onClick={() => setDivision(div)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  activo
                    ? `${style.bg} ${style.text} ${style.border}`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {DIVISION_LABEL[div]}
              </button>
            )
          })}
        </div>

        {loading ? (
          <Spinner />
        ) : fetchError ? (
          <p className="text-red-400 text-center py-16">Error al conectar con el servidor.</p>
        ) : !rankings ? (
          <p className="text-gray-500 text-center py-16">Sin datos.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <RankingCard
              titulo="Jugadores por puntos"
              icono="🏆"
              vacio={rankings.jugadoresPorPuntos.length === 0}
              vaciMsg="Sin puntuaciones aún"
              divStyle={d}
            >
              {rankings.jugadoresPorPuntos.map((j, i) => (
                <JugadorRow
                  key={j.jugadorId}
                  pos={i + 1}
                  nombre={j.nombre}
                  posicion={j.posicion}
                  equipo={j.equipoNombre}
                  valor={Number(j.totalPuntos ?? 0)}
                  unidad="pts"
                  divStyle={d}
                  onClick={() => setModalJugador({ id: j.jugadorId, nombre: j.nombre, posicion: j.posicion, equipo: j.equipoNombre })}
                />
              ))}
            </RankingCard>

            <RankingCard
              titulo="Jugadores más valiosos"
              icono="💎"
              vacio={rankings.jugadoresPorValor.length === 0}
              vaciMsg="Sin jugadores registrados"
              divStyle={d}
            >
              {rankings.jugadoresPorValor.map((j, i) => (
                <JugadorRow
                  key={j.jugadorId}
                  pos={i + 1}
                  nombre={j.nombre}
                  posicion={j.posicion}
                  equipo={j.equipoNombre}
                  valor={j.valor}
                  unidad="M"
                  divStyle={d}
                  onClick={() => setModalJugador({ id: j.jugadorId, nombre: j.nombre, posicion: j.posicion, equipo: j.equipoNombre })}
                />
              ))}
            </RankingCard>

            <RankingCard
              titulo="Managers destacados"
              icono="👑"
              vacio={rankings.usuariosPorPuntos.length === 0}
              vaciMsg="No hay ligas públicas activas"
              divStyle={d}
            >
              {rankings.usuariosPorPuntos.map((u, i) => (
                <UsuarioRow
                  key={`${u.usuarioId}-${u.ligaId}`}
                  pos={i + 1}
                  username={u.username}
                  liga={u.ligaNombre}
                  puntuacion={u.puntuacion}
                  divStyle={d}
                  onClick={() => setModalUsuario({ ligaId: u.ligaId, miembroId: u.miembroLigaId, username: u.username })}
                />
              ))}
            </RankingCard>
          </div>
        )}
      </main>
    </>
  )
}

// ── Subcomponents ────────────────────────────────────────────────

function RankingCard({
  titulo, icono, vacio, vaciMsg, children, divStyle,
}: {
  titulo: string
  icono: string
  vacio: boolean
  vaciMsg: string
  children: React.ReactNode
  divStyle: { bg: string; border: string; text: string; badge: string; bar: string }
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-4 py-3 ${divStyle.bg} border-b ${divStyle.border}`}>
        <h2 className={`text-sm font-semibold ${divStyle.text} flex items-center gap-1.5`}>
          <span>{icono}</span>
          {titulo}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {vacio ? (
          <p className="text-sm text-gray-400 text-center py-8 px-4">{vaciMsg}</p>
        ) : children}
      </div>
    </div>
  )
}

function JugadorRow({
  pos, nombre, posicion, equipo, valor, unidad, divStyle, onClick,
}: {
  pos: number
  nombre: string
  posicion: string
  equipo: string
  valor: number
  unidad: string
  divStyle: { badge: string; text: string; bg: string; border: string; bar: string }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      <span className="w-5 text-center text-xs font-bold text-gray-400">{pos}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600">{nombre}</p>
        <p className="text-xs text-gray-400 truncate">{equipo}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${divStyle.badge}`}>
          {POSICION_LABEL[posicion] ?? '?'}
        </span>
        <p className={`text-sm font-bold mt-0.5 ${divStyle.text}`}>{valor} {unidad}</p>
      </div>
    </button>
  )
}

function UsuarioRow({
  pos, username, liga, puntuacion, divStyle, onClick,
}: {
  pos: number
  username: string
  liga: string
  puntuacion: number
  divStyle: { text: string; bg: string; border: string; badge: string; bar: string }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      <span className="w-5 text-center text-xs font-bold text-gray-400">{pos}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600">{username}</p>
        <p className="text-xs text-gray-400 truncate">{liga}</p>
      </div>
      <p className={`text-sm font-bold shrink-0 ${divStyle.text}`}>{puntuacion} pts</p>
    </button>
  )
}
