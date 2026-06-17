import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getHistorialSaldo } from '../api/ligas'
import Spinner from '../components/Spinner'

interface MovimientoSaldo {
  id: string
  concepto: string
  importe: number
  saldoResultante: number
  descripcion: string | null
  jugadorNombre: string | null
  numJornada: number | null
  creadoEn: string
}

const CONCEPTO_LABEL: Record<string, { label: string; color: string }> = {
  PRESUPUESTO_INICIAL: { label: 'Presupuesto inicial', color: 'bg-blue-100 text-blue-700'   },
  COMPRA_MERCADO:      { label: 'Compra',              color: 'bg-red-100 text-red-700'      },
  VENTA_MERCADO:       { label: 'Venta',               color: 'bg-green-100 text-green-700'  },
  VENTA_RAPIDA:        { label: 'Venta rápida',        color: 'bg-green-100 text-green-600'  },
  CLAUSULAZO_PAGO:     { label: 'Cláusula pagada',     color: 'bg-red-100 text-red-700'      },
  CLAUSULAZO_COBRO:    { label: 'Cláusula cobrada',    color: 'bg-green-100 text-green-700'  },
  INVERSION_CLAUSULA:  { label: 'Inversión cláusula',  color: 'bg-orange-100 text-orange-700'},
}

function fmt(n: number) { return n.toLocaleString('es-ES') }
function fmtDate(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function HistorialSaldoPage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const [movimientos, setMovimientos] = useState<MovimientoSaldo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ligaId) return
    getHistorialSaldo(ligaId)
      .then(r => setMovimientos(r.data))
      .finally(() => setLoading(false))
  }, [ligaId])

  if (loading) return <Spinner />

  const saldoInicial = movimientos[0]?.saldoResultante - (movimientos[0]?.importe ?? 0)
  const saldoActual  = movimientos.at(-1)?.saldoResultante ?? 0
  const totalGastos  = movimientos.filter(m => m.importe < 0).reduce((s, m) => s + Math.abs(m.importe), 0)
  const totalIngresos = movimientos.filter(m => m.importe > 0).reduce((s, m) => s + m.importe, 0)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/ligas/${ligaId}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
        ← Volver a la liga
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de saldo</h1>
        <p className="text-sm text-gray-500 mt-0.5">{movimientos.length} movimientos registrados</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Saldo actual</p>
          <p className="text-lg font-bold text-gray-900">{fmt(saldoActual)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm px-4 py-3">
          <p className="text-xs text-red-400 mb-0.5">Total gastado</p>
          <p className="text-lg font-bold text-red-600">-{fmt(totalGastos)}</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 shadow-sm px-4 py-3">
          <p className="text-xs text-green-400 mb-0.5">Total ingresado</p>
          <p className="text-lg font-bold text-green-600">+{fmt(totalIngresos)}</p>
        </div>
      </div>

      {movimientos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">Sin movimientos registrados aún.</p>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {[...movimientos].reverse().map(m => {
            const c = CONCEPTO_LABEL[m.concepto] ?? { label: m.concepto, color: 'bg-gray-100 text-gray-500' }
            return (
              <div key={m.id} className="flex items-center px-5 py-3.5 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${c.color}`}>
                      {c.label}
                    </span>
                    {m.numJornada && (
                      <span className="text-xs text-gray-400">J{m.numJornada}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{m.descripcion ?? '—'}</p>
                  <p className="text-xs text-gray-400">{fmtDate(m.creadoEn)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${m.importe >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {m.importe >= 0 ? '+' : ''}{fmt(m.importe)}
                  </p>
                  <p className="text-xs text-gray-400">{fmt(m.saldoResultante)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
