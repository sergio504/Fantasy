import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getLigasPublicas, getMisLigas, unirseALiga } from '../api/ligas'
import Spinner from '../components/Spinner'
import { DIVISION_LABEL, DIVISION_STYLE } from '../constants/divisiones'

interface Liga {
  id: string
  nombre: string
  division: string
  maxEquipos: number
  presupuestoInicial: number
  _count: { miembros: number }
}


export default function LigasPublicasPage() {
  const navigate = useNavigate()
  const [ligas, setLigas] = useState<Liga[]>([])
  const [misLigaIds, setMisLigaIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([getLigasPublicas(), getMisLigas()])
      .then(([ligasR, misR]) => {
        setLigas(ligasR.data)
        setMisLigaIds(new Set(misR.data.map((m: any) => m.liga.id)))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleUnirse = async (ligaId: string) => {
    setJoining(ligaId)
    setError(prev => ({ ...prev, [ligaId]: '' }))
    try {
      await unirseALiga(ligaId)
      navigate(`/ligas/${ligaId}`)
    } catch (err: any) {
      setError(prev => ({ ...prev, [ligaId]: err.response?.data?.error ?? 'No se pudo unir' }))
    } finally {
      setJoining(null)
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ligas públicas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Únete a una liga pública disponible</p>
      </div>

      {loading ? (
        <Spinner />
      ) : ligas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-gray-600 font-medium">No hay ligas públicas disponibles</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ligas.map(liga => {
            const d = DIVISION_STYLE[liga.division] ?? DIVISION_STYLE.RFEF3_GRUPO_IV
            const llena = liga._count.miembros >= liga.maxEquipos
            const esMiembro = misLigaIds.has(liga.id)
            const pct = Math.round((liga._count.miembros / liga.maxEquipos) * 100)

            return (
              <div key={liga.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 text-sm leading-tight pr-2">{liga.nombre}</h2>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${d.badge}`}>
                    {DIVISION_LABEL[liga.division] ?? liga.division}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{liga._count.miembros}/{liga.maxEquipos} equipos</span>
                    <span>{liga.presupuestoInicial}M iniciales</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${d.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {error[liga.id] && <p className="text-xs text-red-600 mb-2">{error[liga.id]}</p>}

                {esMiembro ? (
                  <Link
                    to={`/ligas/${liga.id}`}
                    className="block w-full text-center text-sm py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-semibold border border-indigo-200"
                  >
                    Ver liga →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUnirse(liga.id)}
                    disabled={llena || joining === liga.id}
                    className="w-full text-sm py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {llena ? 'Liga llena' : joining === liga.id ? 'Uniéndose...' : 'Unirse'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
