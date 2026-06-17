import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPlantillasLiga, ejecutarClausulazo } from '../api/ligas'
import Spinner from '../components/Spinner'

interface JugadorPlantilla {
  plantillaId:     string
  miembroLigaId:   string
  propietario:     string | null
  esMio:           boolean
  clausula:        number
  jornadasBloqueo: number
  pendiente:       { compradorMiembroId: string; importe: number } | null
  jugador: {
    id: string; nombreCompleto: string; nombre: string
    posicion: string; valor: number; dorsal: number | null
    equipo: string | null
  }
}

const POS_STYLE: Record<string, { label: string; color: string }> = {
  PORTERO:        { label: 'POR', color: 'bg-yellow-100 text-yellow-700' },
  DEFENSA:        { label: 'DEF', color: 'bg-blue-100 text-blue-700'    },
  CENTROCAMPISTA: { label: 'CEN', color: 'bg-purple-100 text-purple-700'},
  DELANTERO:      { label: 'DEL', color: 'bg-red-100 text-red-700'      },
}

function fmt(n: number) { return n.toLocaleString('es-ES') }

export default function ClausulazosPage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const [plantillas, setPlantillas] = useState<JugadorPlantilla[]>([])
  const [loading, setLoading]       = useState(true)
  const [ejecutando, setEjecutando] = useState<string | null>(null)
  const [flash, setFlash]           = useState<{ msg: string; error: boolean } | null>(null)

  const cargar = () =>
    getPlantillasLiga(ligaId!).then(r => setPlantillas(r.data)).finally(() => setLoading(false))

  useEffect(() => { if (ligaId) cargar() }, [ligaId])

  const showFlash = (msg: string, error = false) => {
    setFlash({ msg, error })
    setTimeout(() => setFlash(null), 3000)
  }

  const handleClausulazo = async (p: JugadorPlantilla) => {
    if (!confirm(
      `¿Pagar la cláusula de ${p.jugador.nombre} por ${fmt(p.clausula)}?\n\n` +
      (p.pendiente ? 'ADVERTENCIA: el jugador está en el 11 y el traspaso se hará efectivo en la próxima jornada.' :
       'El traspaso será inmediato.')
    )) return

    setEjecutando(p.jugador.id)
    try {
      const r = await ejecutarClausulazo(ligaId!, p.jugador.id)
      showFlash(r.data.mensaje)
      cargar()
    } catch (e: any) {
      showFlash(e.response?.data?.error ?? 'Error al ejecutar el clausulazo', true)
    } finally {
      setEjecutando(null)
    }
  }

  if (loading) return <Spinner />

  // Agrupar por propietario, excluir los míos
  const rivales = plantillas.filter(p => !p.esMio)
  const porPropietario = new Map<string, JugadorPlantilla[]>()
  for (const p of rivales) {
    const key = p.propietario ?? 'Sin dueño'
    if (!porPropietario.has(key)) porPropietario.set(key, [])
    porPropietario.get(key)!.push(p)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`/ligas/${ligaId}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
        ← Volver a la liga
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clausulazos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ficha a cualquier jugador pagando su cláusula</p>
        </div>
      </div>

      {flash && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
          flash.error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
        }`}>
          {flash.msg}
        </div>
      )}

      {porPropietario.size === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No hay otros equipos en esta liga aún.</p>
      )}

      <div className="space-y-6">
        {[...porPropietario.entries()].map(([propietario, jugadores]) => (
          <div key={propietario} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-700">Equipo de {propietario}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {jugadores.map(p => {
                const ps      = POS_STYLE[p.jugador.posicion] ?? { label: '?', color: 'bg-gray-100 text-gray-500' }
                const bloq    = p.jornadasBloqueo > 0
                const pend    = !!p.pendiente
                const activo  = ejecutando === p.jugador.id

                return (
                  <div key={p.plantillaId} className="flex items-center px-5 py-3 gap-3">
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold ${ps.color}`}>
                      {ps.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.jugador.nombreCompleto}</p>
                      <p className="text-xs text-gray-400">
                        {p.jugador.equipo ?? '—'}{p.jugador.dorsal ? ` · #${p.jugador.dorsal}` : ''}
                        {' · '}<span className="font-medium text-gray-500">{fmt(p.jugador.valor)}</span>
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-indigo-600">{fmt(p.clausula)}</p>
                      <p className="text-xs text-gray-400">cláusula</p>
                    </div>

                    <div className="shrink-0 w-28 text-right">
                      {pend ? (
                        <span className="inline-block text-xs px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-700 font-semibold">
                          Cláusula pagada
                        </span>
                      ) : bloq ? (
                        <span className="inline-block text-xs px-2.5 py-1.5 rounded-xl bg-gray-100 text-gray-500 font-semibold">
                          🔒 {p.jornadasBloqueo}j
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClausulazo(p)}
                          disabled={activo}
                          className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {activo ? '...' : 'Fichar'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
