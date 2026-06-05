import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMiEquipo, getAlineacion, guardarAlineacion, getUltimaJornadaStats } from '../api/ligas'
import { getOfertas, cerrarOferta, cancelarOferta } from '../api/mercado'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import JugadorModal from '../components/JugadorModal'

interface EquipoReal { nombre: string }
interface Jugador {
  id: string; nombre: string; nombreCompleto: string; posicion: string
  edad: number | null; valor: number
  historialEquipos: { equipo: EquipoReal }[]
}
interface JugadorEquipo { id: string; jugadorId: string; jugador: Jugador }
interface UltimaStats { puntos: number; convocado: boolean; titular: boolean; goles: number; resultado: string }

function equipoNombre(j: Jugador) { return j.historialEquipos[0]?.equipo?.nombre ?? '—' }

function PtsBadge({ puntos }: { puntos: number | undefined }) {
  if (puntos === undefined) return null
  const color = puntos >= 8 ? 'bg-green-100 text-green-700' : puntos >= 4 ? 'bg-blue-100 text-blue-700' : puntos > 0 ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
  return <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md font-bold ${color}`}>{puntos} pts</span>
}
interface Oferta {
  id: string; jugadorId: string; vendedorId: string | null; precioMinimo: number
  numPujas: number
  fechaCaducidad: string | null
  vendedor: { id: string; usuario: { username: string } } | null
}

type Formacion = '4-3-3' | '3-4-3' | '4-4-2'

const SLOTS: Record<Formacion, Record<string, number>> = {
  '4-3-3': { PORTERO: 1, DEFENSA: 4, CENTROCAMPISTA: 3, DELANTERO: 3 },
  '3-4-3': { PORTERO: 1, DEFENSA: 3, CENTROCAMPISTA: 4, DELANTERO: 3 },
  '4-4-2': { PORTERO: 1, DEFENSA: 4, CENTROCAMPISTA: 4, DELANTERO: 2 },
}

const POS_ORDER = ['PORTERO', 'DEFENSA', 'CENTROCAMPISTA', 'DELANTERO']

const POS_STYLE: Record<string, { label: string; color: string }> = {
  PORTERO:        { label: 'POR', color: 'bg-yellow-100 text-yellow-700'  },
  DEFENSA:        { label: 'DEF', color: 'bg-blue-100 text-blue-700'      },
  CENTROCAMPISTA: { label: 'CEN', color: 'bg-purple-100 text-purple-700'  },
  DELANTERO:      { label: 'DEL', color: 'bg-red-100 text-red-700'        },
}

const POS_NOMBRE: Record<string, string> = {
  PORTERO: 'Porteros', DEFENSA: 'Defensas',
  CENTROCAMPISTA: 'Centrocampistas', DELANTERO: 'Delanteros',
}

export default function MisJugadoresPage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const { usuario } = useAuth()

  const [jugadores, setJugadores] = useState<JugadorEquipo[]>([])
  const [misOfertas, setMisOfertas] = useState<Oferta[]>([])
  const [formacion, setFormacion] = useState<Formacion>('4-3-3')
  const [titularIds, setTitularIds] = useState<Set<string>>(new Set())
  const [capitanId, setCapitanId] = useState<string | null>(null)
  const [ultimaStats, setUltimaStats] = useState<{ numJornada: number; stats: Record<string, UltimaStats> } | null>(null)
  const [modalJugador, setModalJugador] = useState<{ id: string; nombreCompleto: string; posicion: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [error, setError] = useState('')

  const cargar = async () => {
    const [equipoR, alineR, ofertasR, statsR] = await Promise.all([
      getMiEquipo(ligaId!),
      getAlineacion(ligaId!),
      getOfertas(ligaId!),
      getUltimaJornadaStats(ligaId!),
    ])
    setJugadores(equipoR.data)
    setFormacion(alineR.data.formacion as Formacion)
    setTitularIds(new Set(alineR.data.titularIds))
    setCapitanId(alineR.data.capitanId ?? null)
    if (statsR.data.jornada) setUltimaStats({ numJornada: statsR.data.jornada.numJornada, stats: statsR.data.stats })

    // Solo mis ofertas activas (donde soy el vendedor)
    const mias: Oferta[] = ofertasR.data.filter(
      (o: Oferta) => o.vendedor?.usuario.username === usuario?.username
    )
    setMisOfertas(mias)
  }

  useEffect(() => {
    if (!ligaId) return
    cargar().finally(() => setLoading(false))
  }, [ligaId])

  // IDs de jugadores que tengo en el mercado ahora mismo
  const idsEnVenta = new Set(misOfertas.map(o => o.jugadorId))

  const toggleTitular = (jugadorId: string, posicion: string) => {
    if (idsEnVenta.has(jugadorId)) return // en venta: no se puede tocar
    setTitularIds(prev => {
      const next = new Set(prev)
      if (next.has(jugadorId)) {
        next.delete(jugadorId)
        // Si era el capitán, quitarlo
        if (capitanId === jugadorId) setCapitanId(null)
      } else {
        const slots = SLOTS[formacion]
        const actualesEnPos = jugadores.filter(
          je => je.jugadorId !== jugadorId && next.has(je.jugadorId) && je.jugador.posicion === posicion
        ).length
        if (actualesEnPos >= slots[posicion]) return prev
        next.add(jugadorId)
      }
      return next
    })
  }

  const cambiarFormacion = (nueva: Formacion) => {
    setFormacion(nueva)
    setTitularIds(prev => {
      const slots = SLOTS[nueva]
      const next = new Set<string>()
      const conteo: Record<string, number> = {}
      for (const je of jugadores) {
        if (!prev.has(je.jugadorId) || idsEnVenta.has(je.jugadorId)) continue
        const pos = je.jugador.posicion
        conteo[pos] = (conteo[pos] ?? 0) + 1
        if (conteo[pos] <= (slots[pos] ?? 0)) next.add(je.jugadorId)
      }
      // Si el capitán no está en los nuevos titulares, quitarlo
      if (capitanId && !next.has(capitanId)) setCapitanId(null)
      return next
    })
  }

  const handleGuardar = async () => {
    setError('')
    const ids = Array.from(titularIds)
    if (ids.length !== 11) {
      setError(`Debes seleccionar exactamente 11 titulares (tienes ${ids.length})`)
      return
    }
    setGuardando(true)
    try {
      await guardarAlineacion(ligaId!, { formacion, jugadorIds: ids, capitanId })
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleQuitarMercado = async (ofertaId: string) => {
    if (!confirm('¿Quitar este jugador del mercado? Se cancelarán todas las pujas.')) return
    try {
      await cancelarOferta(ligaId!, ofertaId)
      await cargar()
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Error al cancelar')
    }
  }

  const handleAceptarPuja = async (ofertaId: string, jugadorNombre: string) => {
    if (!confirm(`¿Aceptar la puja más alta por ${jugadorNombre}? El jugador pasará al equipo del mejor postor.`)) return
    try {
      await cerrarOferta(ligaId!, ofertaId)
      await cargar()
      alert(`✅ Transferencia completada. El dinero ya está en tu presupuesto.`)
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Error al cerrar la oferta')
    }
  }

  if (loading) return <Spinner />

  const slots = SLOTS[formacion]

  // Jugadores agrupados por posición, excluyendo los que están en venta
  const porPosicion: Record<string, JugadorEquipo[]> = {}
  for (const je of jugadores) {
    if (idsEnVenta.has(je.jugadorId)) continue
    const pos = je.jugador.posicion
    if (!porPosicion[pos]) porPosicion[pos] = []
    porPosicion[pos].push(je)
  }

  const titularesTotal = titularIds.size
  const suplentes = jugadores.filter(
    je => !titularIds.has(je.jugadorId) && !idsEnVenta.has(je.jugadorId)
  )

  // Mapa jugadorId → JugadorEquipo para la sección "En venta"
  const jugadorMap = new Map(jugadores.map(je => [je.jugadorId, je]))

  return (
    <>
    {modalJugador && (
      <JugadorModal
        jugadorId={modalJugador.id}
        nombreCompleto={modalJugador.nombreCompleto}
        posicion={modalJugador.posicion}
        onClose={() => setModalJugador(null)}
      />
    )}
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`/ligas/${ligaId}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
        ← Volver a la liga
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis jugadores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{jugadores.length} en plantilla · {idsEnVenta.size} en venta</p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold ${titularesTotal === 11 ? 'text-green-600' : 'text-orange-500'}`}>
            {titularesTotal}/11 titulares
          </span>
        </div>
      </div>

      {/* Selector de formación */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Formación</p>
        <div className="grid grid-cols-3 gap-2">
          {(['4-3-3', '3-4-3', '4-4-2'] as Formacion[]).map(f => (
            <button
              key={f}
              onClick={() => cambiarFormacion(f)}
              className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                formacion === f
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {Object.entries(slots).map(([pos, n]) => `${n} ${POS_STYLE[pos].label}`).join(' · ')}
        </p>
      </div>

      {/* Jugadores por posición */}
      <div className="space-y-4 mb-6">
        {POS_ORDER.map(pos => {
          const lista = porPosicion[pos] ?? []
          const max = slots[pos] ?? 0
          const actuales = lista.filter(je => titularIds.has(je.jugadorId)).length
          const lleno = actuales >= max

          return (
            <div key={pos} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                <span className="text-sm font-semibold text-gray-700">{POS_NOMBRE[pos]}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  actuales === max ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {actuales}/{max}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {lista.map(je => {
                  const esTitular = titularIds.has(je.jugadorId)
                  const puedeToggle = esTitular || !lleno
                  const esCapitan = capitanId === je.jugadorId
                  const ps = POS_STYLE[pos]

                  return (
                    <div key={je.id} className={`flex items-center px-5 py-3 gap-2 ${esTitular ? 'bg-indigo-50/40' : ''}`}>
                      <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold ${ps.color}`}>
                        {ps.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setModalJugador({ id: je.jugadorId, nombreCompleto: je.jugador.nombreCompleto, posicion: je.jugador.posicion })} className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 hover:underline text-left">{je.jugador.nombreCompleto}</button>
                          {esCapitan && (
                            <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">C</span>
                          )}
                          <PtsBadge puntos={ultimaStats?.stats[je.jugadorId]?.puntos} />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          {equipoNombre(je.jugador)}{je.jugador.edad ? ` · ${je.jugador.edad} años` : ''}
                          {ultimaStats && ` · J${ultimaStats.numJornada}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{je.jugador.valor}M</span>
                      {/* Botón capitán — solo visible para titulares */}
                      {esTitular && (
                        <button
                          onClick={() => setCapitanId(esCapitan ? null : je.jugadorId)}
                          title={esCapitan ? 'Quitar capitanía' : 'Hacer capitán (puntúa doble)'}
                          className={`shrink-0 w-7 h-7 rounded-lg text-sm font-bold border transition-all ${
                            esCapitan
                              ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-white text-gray-300 border-gray-200 hover:border-amber-300 hover:text-amber-500'
                          }`}
                        >
                          C
                        </button>
                      )}
                      <button
                        onClick={() => puedeToggle && toggleTitular(je.jugadorId, pos)}
                        disabled={!puedeToggle}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                          esTitular
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : puedeToggle
                            ? 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                            : 'bg-white text-gray-300 border-gray-100 cursor-not-allowed'
                        }`}
                      >
                        {esTitular ? '✓ Titular' : 'Suplente'}
                      </button>
                    </div>
                  )
                })}
                {lista.length === 0 && (
                  <p className="px-5 py-3 text-xs text-gray-400 italic">Sin jugadores disponibles</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Guardar */}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mb-4">
          ⚠️ {error}
        </div>
      )}
      <button
        onClick={handleGuardar}
        disabled={guardando || titularesTotal !== 11}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all mb-8 ${
          guardadoOk
            ? 'bg-green-600 text-white'
            : titularesTotal === 11
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {guardadoOk ? '✓ Alineación guardada' : guardando ? 'Guardando...' : 'Guardar alineación'}
      </button>

      {/* Suplentes */}
      {suplentes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Suplentes ({suplentes.length})</h2>
            <p className="text-xs text-gray-400 mt-0.5">No puntúan esta semana · Puedes venderlos</p>
          </div>
          <div className="divide-y divide-gray-50">
            {suplentes.map(je => {
              const ps = POS_STYLE[je.jugador.posicion]
              return (
                <div key={je.id} className="flex items-center px-5 py-3 gap-3">
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold ${ps.color}`}>
                    {ps.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{je.jugador.nombreCompleto}</p>
                      <PtsBadge puntos={ultimaStats?.stats[je.jugadorId]?.puntos} />
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {equipoNombre(je.jugador)}{je.jugador.edad ? ` · ${je.jugador.edad} años` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{je.jugador.valor}M</span>
                  <button
                    onClick={async () => {
                      const precio = window.prompt(
                        `Precio de mercado de ${je.jugador.nombreCompleto}: ${je.jugador.valor}M\n¿Qué precio mínimo quieres ponerle?`,
                        String(je.jugador.valor)
                      )
                      if (precio === null) return
                      const num = Number(precio)
                      if (isNaN(num) || num <= 0) { alert('Precio no válido'); return }

                      const diasStr = window.prompt(
                        `¿Cuántos días quieres que dure la oferta?\n(Escribe 0 o déjalo vacío para oferta sin caducidad)`,
                        '0'
                      )
                      if (diasStr === null) return
                      const dias = Number(diasStr)
                      if (isNaN(dias) || dias < 0) { alert('Días no válido'); return }

                      const { crearOferta } = await import('../api/mercado')
                      crearOferta(ligaId!, {
                        jugadorId: je.jugadorId,
                        precioMinimo: num,
                        ...(dias > 0 && { diasCaducidad: dias }),
                      })
                        .then(() => {
                          const duracion = dias > 0 ? ` · Caduca en ${dias} día${dias > 1 ? 's' : ''}` : ''
                          alert(`✅ ${je.jugador.nombreCompleto} puesto en venta por ${num}M mínimo${duracion}`)
                          cargar()
                        })
                        .catch((err: any) => alert(err.response?.data?.error ?? 'Error al poner en venta'))
                    }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-xl font-semibold border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    Vender
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* En venta */}
      {misOfertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-orange-100 bg-orange-50/50">
            <h2 className="text-sm font-semibold text-orange-800">En venta ({misOfertas.length})</h2>
            <p className="text-xs text-orange-600/70 mt-0.5">No puedes ver las pujas hasta que aceptes</p>
          </div>
          <div className="divide-y divide-gray-50">
            {misOfertas.map(oferta => {
              const je = jugadorMap.get(oferta.jugadorId)
              if (!je) return null
              const ps = POS_STYLE[je.jugador.posicion]
              const numPujas = oferta.numPujas

              return (
                <div key={oferta.id} className="flex items-center px-5 py-3 gap-3">
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold ${ps.color}`}>
                    {ps.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{je.jugador.nombreCompleto}</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {equipoNombre(je.jugador)}{je.jugador.edad ? ` · ${je.jugador.edad} años` : ''}
                    </p>
                    {oferta.fechaCaducidad && (() => {
                      const diff = new Date(oferta.fechaCaducidad).getTime() - Date.now()
                      const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
                      return (
                        <p className={`text-xs mt-0.5 font-medium ${dias <= 1 ? 'text-red-500' : 'text-gray-400'}`}>
                          ⏱ {dias <= 0 ? 'Caducada' : dias === 1 ? 'Caduca hoy' : `Caduca en ${dias} días`}
                        </p>
                      )
                    })()}
                  </div>
                  <div className="shrink-0 text-center px-2">
                    <p className="text-lg font-bold text-gray-900">{numPujas}</p>
                    <p className="text-xs text-gray-400">{numPujas === 1 ? 'puja' : 'pujas'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAceptarPuja(oferta.id, je.jugador.nombreCompleto)}
                      disabled={numPujas === 0}
                      className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleQuitarMercado(oferta.id)}
                      className="text-xs px-3 py-1.5 rounded-xl font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
    </>
  )
}
