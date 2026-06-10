import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTransferencias } from '../api/ligas'
import Spinner from '../components/Spinner'

interface EquipoReal { nombre: string }
interface Transferencia {
  id: string
  precio: number
  fecha: string
  jugador: {
    nombre: string; nombreCompleto: string; posicion: string
    historialEquipos: { equipo: EquipoReal }[]
  }
  vendedor: { usuario: { username: string } } | null
  comprador: { usuario: { username: string } }
}

const POS_STYLE: Record<string, { label: string; color: string }> = {
  PORTERO:        { label: 'POR', color: 'bg-yellow-100 text-yellow-700'   },
  DEFENSA:        { label: 'DEF', color: 'bg-blue-100 text-blue-700'       },
  CENTROCAMPISTA: { label: 'CEN', color: 'bg-purple-100 text-purple-700'   },
  DELANTERO:      { label: 'DEL', color: 'bg-red-100 text-red-700'         },
}

export default function TransferenciasPage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ligaId) return
    getTransferencias(ligaId)
      .then(r => setTransferencias(r.data))
      .finally(() => setLoading(false))
  }, [ligaId])

  if (loading) return <Spinner />

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`/ligas/${ligaId}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
        ← Volver a la liga
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historial de transferencias</h1>

      {transferencias.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-4">📋</span>
          <p className="text-gray-500 font-medium">Aún no se han realizado transferencias</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {transferencias.map(t => {
              const pos = POS_STYLE[t.jugador.posicion] ?? { label: '?', color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={t.id} className="px-5 py-4 flex items-center gap-3">
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold ${pos.color}`}>
                    {pos.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.jugador.nombre}</p>
                    <p className="text-xs text-gray-400">{t.jugador.historialEquipos[0]?.equipo?.nombre ?? '—'}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <span className="font-medium text-gray-600">{t.vendedor ? t.vendedor.usuario.username : 'Sistema'}</span>
                      <span>→</span>
                      <span className="font-medium text-gray-600">{t.comprador.usuario.username}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{t.precio}M</p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
