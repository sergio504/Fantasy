import { useEffect, useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMisLigas, unirseConCodigo } from '../api/ligas'
import Spinner from '../components/Spinner'
import { DIVISION_LABEL, DIVISION_STYLE } from '../constants/divisiones'

interface MiembroLiga {
  id: string
  presupuestoRestante: number
  puntuacion: number
  liga: {
    id: string
    nombre: string
    division: string
    publica: boolean
    _count: { miembros: number }
    maxEquipos: number
  }
}


export default function DashboardPage() {
  const navigate = useNavigate()
  const [membresias, setMembresias] = useState<MiembroLiga[]>([])
  const [loading, setLoading] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [codigoError, setCodigoError] = useState('')
  const [codigoLoading, setCodigoLoading] = useState(false)

  useEffect(() => {
    getMisLigas()
      .then(r => setMembresias(r.data))
      .finally(() => setLoading(false))
  }, [])

  const handleUnirseConCodigo = async (e: FormEvent) => {
    e.preventDefault()
    setCodigoError('')
    setCodigoLoading(true)
    try {
      const { data } = await unirseConCodigo(codigo)
      setCodigo('')
      navigate(`/ligas/${data.ligaId}`)
    } catch (err: any) {
      setCodigoError(err.response?.data?.error ?? 'Código no válido')
    } finally {
      setCodigoLoading(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis ligas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tus equipos y competiciones</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/ligas"
            className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Explorar
          </Link>
          <Link
            to="/ligas/crear"
            className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200"
          >
            + Nueva liga
          </Link>
        </div>
      </div>

      {/* Unirse con código */}
      <form
        onSubmit={handleUnirseConCodigo}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-8"
      >
        <p className="text-sm font-medium text-gray-700 mb-2.5">🔒 Unirse a liga privada</p>
        <div className="flex gap-2">
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="Introduce el código de invitación"
            className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={codigoLoading || !codigo}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {codigoLoading ? '...' : 'Unirse'}
          </button>
        </div>
        {codigoError && <p className="text-xs text-red-600 mt-1.5">{codigoError}</p>}
      </form>

      {/* Lista de ligas */}
      {loading ? (
        <Spinner />
      ) : membresias.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-4">🏟️</span>
          <p className="text-gray-700 font-semibold mb-1">Aún no estás en ninguna liga</p>
          <p className="text-sm text-gray-400 mb-6">Crea la tuya o únete a una pública</p>
          <div className="flex gap-2 justify-center">
            <Link to="/ligas/crear" className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
              Crear liga
            </Link>
            <Link to="/ligas" className="text-sm px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium">
              Explorar ligas
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {membresias.map(m => {
            const d = DIVISION_STYLE[m.liga.division] ?? DIVISION_STYLE.RFEF3_GRUPO_IV
            return (
              <Link
                key={m.id}
                to={`/ligas/${m.liga.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 text-sm leading-tight pr-2">{m.liga.nombre}</h2>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${d.badge}`}>
                    {DIVISION_LABEL[m.liga.division] ?? m.liga.division}
                  </span>
                </div>

                <div className={`rounded-xl ${d.bg} border ${d.border} px-3 py-2 mb-3`}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Presupuesto</span>
                    <span className="font-semibold text-gray-800">{m.presupuestoRestante}M</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500">Puntuación</span>
                    <span className="font-semibold text-gray-800">{m.puntuacion} pts</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{m.liga._count.miembros}/{m.liga.maxEquipos} equipos</span>
                  <span>{m.liga.publica ? 'Pública' : '🔒 Privada'}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
