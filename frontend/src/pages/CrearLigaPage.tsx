import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearLiga } from '../api/ligas'
import { DIVISIONES, DIVISION_LABEL } from '../constants/divisiones'

export default function CrearLigaPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [division, setDivision] = useState(DIVISIONES[0])
  const [publica, setPublica] = useState(true)
  const [maxEquipos, setMaxEquipos] = useState(10)
  const [presupuestoInicial, setPresupuestoInicial] = useState(100)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codigoCreado, setCodigoCreado] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await crearLiga({ nombre, division, publica, maxEquipos, presupuestoInicial })
      if (!publica && data.codigoInvitacion) {
        setCodigoCreado(data.codigoInvitacion)
      } else {
        navigate(`/ligas/${data.id}`)
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al crear la liga')
    } finally {
      setLoading(false)
    }
  }

  if (codigoCreado) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Liga creada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Comparte este código para que tus amigos se unan:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-6">
            <p className="font-mono text-2xl font-bold text-indigo-600 tracking-widest">{codigoCreado}</p>
          </div>
          <button
            onClick={() => navigate('/inicio')}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Ir a mis ligas
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nueva liga</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configura tu competición</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg space-y-5">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
            <span>⚠️</span> {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la liga</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Ej: Liga del barrio 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">División</label>
          <div className="grid grid-cols-1 gap-2">
            {DIVISIONES.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDivision(d)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  division === d
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {DIVISION_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visibilidad</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ val: true, label: '🌍 Pública', desc: 'Cualquiera puede unirse' }, { val: false, label: '🔒 Privada', desc: 'Solo con código' }].map(opt => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => setPublica(opt.val)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  publica === opt.val
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Máx. equipos</label>
            <input
              type="number"
              value={maxEquipos}
              onChange={e => setMaxEquipos(Number(e.target.value))}
              min={2} max={20}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Presupuesto (M)</label>
            <input
              type="number"
              value={presupuestoInicial}
              onChange={e => setPresupuestoInicial(Number(e.target.value))}
              min={10}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200"
        >
          {loading ? 'Creando...' : 'Crear liga'}
        </button>
      </form>
    </main>
  )
}
