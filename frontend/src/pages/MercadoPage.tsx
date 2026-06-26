import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getOfertas, pujar, cerrarOferta, cancelarOferta, crearOferta } from '../api/mercado'
import { getMiEquipo, getUltimaJornadaStats } from '../api/ligas'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import JugadorModal from '../components/JugadorModal'

interface EquipoReal { nombre: string }
interface Jugador {
  id: string; nombre: string; nombreCompleto: string; posicion: string
  edad: number | null; valor: number
  historialEquipos: { equipo: EquipoReal }[]
}
interface Oferta {
  id: string; jugadorId: string; vendedorId: string | null; precioMinimo: number
  numPujas: number
  miPuja: number | null
  fechaCaducidad: string | null
  jugador: Jugador
  vendedor: { id: string; usuario: { username: string } } | null
}
interface JugadorEquipo { id: string; jugadorId: string; esTitular: boolean; jugador: Jugador }

function equipoNombre(j: Jugador) { return j.historialEquipos[0]?.equipo?.nombre ?? '—' }

interface UltimaStats { puntos: number }
function PtsBadge({ puntos }: { puntos: number | undefined }) {
  if (puntos === undefined) return null
  const color = puntos >= 8 ? 'bg-green-100 text-green-700' : puntos >= 4 ? 'bg-blue-100 text-blue-700' : puntos > 0 ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
  return <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md font-bold ${color}`}>{puntos} pts</span>
}

function formatCaducidad(fecha: string | null): { texto: string; urgente: boolean } | null {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - Date.now()
  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (dias <= 0) return { texto: 'Caducada', urgente: true }
  if (dias === 1) return { texto: 'Caduca hoy', urgente: true }
  return { texto: `Caduca en ${dias} días`, urgente: dias <= 2 }
}

const POS_STYLE: Record<string, { label: string; color: string }> = {
  PORTERO:        { label: 'POR', color: 'bg-yellow-100 text-yellow-700'   },
  DEFENSA:        { label: 'DEF', color: 'bg-blue-100 text-blue-700'       },
  CENTROCAMPISTA: { label: 'CEN', color: 'bg-purple-100 text-purple-700'   },
  DELANTERO:      { label: 'DEL', color: 'bg-red-100 text-red-700'         },
}

export default function MercadoPage() {
  const { ligaId } = useParams<{ ligaId: string }>()
  const { usuario } = useAuth()

  const [ofertas, setOfertas] = useState<Oferta[]>([])
  const [miEquipo, setMiEquipo] = useState<JugadorEquipo[]>([])
  const [miMiembroId, setMiMiembroId] = useState<string | null>(null)
  const [ultimaStats, setUltimaStats] = useState<{ numJornada: number; stats: Record<string, UltimaStats> } | null>(null)
  const [modalJugador, setModalJugador] = useState<{ id: string; nombre: string; posicion: string; equipo?: string; ligaId?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [pujaOfertaId, setPujaOfertaId] = useState<string | null>(null)
  const [pujaCantidad, setPujaCantidad] = useState('')
  const [pujaLoading, setPujaLoading] = useState(false)
  const [pujaError, setPujaError] = useState('')

  const [mostrarFormOferta, setMostrarFormOferta] = useState(false)
  const [ofertaJugadorId, setOfertaJugadorId] = useState('')
  const [ofertaPrecio, setOfertaPrecio] = useState('')
  const [ofertaDias, setOfertaDias] = useState<string>('0')  // '0' = sin caducidad
  const [ofertaLoading, setOfertaLoading] = useState(false)
  const [ofertaError, setOfertaError] = useState('')

  const cargarOfertas = async () => {
    const r = await getOfertas(ligaId!)
    setOfertas(r.data)
  }

  const cargarEquipo = async () => {
    const r = await getMiEquipo(ligaId!)
    setMiEquipo(r.data)
  }

  useEffect(() => {
    if (!ligaId) return
    Promise.all([
      cargarOfertas(),
      cargarEquipo(),
      getUltimaJornadaStats(ligaId!).then(r => { if (r.data.jornada) setUltimaStats({ numJornada: r.data.jornada.numJornada, stats: r.data.stats }) }),
    ]).finally(() => setLoading(false))
  }, [ligaId])

  useEffect(() => {
    if (!miMiembroId) {
      const miOferta = ofertas.find(o => o.vendedor?.usuario.username === usuario?.username)
      if (miOferta?.vendedorId) setMiMiembroId(miOferta.vendedorId)
    }
  }, [ofertas])

  const handlePujar = async (e: FormEvent, ofertaId: string) => {
    e.preventDefault()
    setPujaError('')
    setPujaLoading(true)
    try {
      await pujar(ligaId!, ofertaId, Number(pujaCantidad))
      setPujaOfertaId(null)
      setPujaCantidad('')
      await cargarOfertas()
    } catch (err: any) {
      setPujaError(err.response?.data?.error ?? 'Error al pujar')
    } finally {
      setPujaLoading(false)
    }
  }

  const handleCerrar = async (ofertaId: string) => {
    try {
      await cerrarOferta(ligaId!, ofertaId)
      await Promise.all([cargarOfertas(), cargarEquipo()])
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Error al cerrar')
    }
  }

  const handleCancelar = async (ofertaId: string) => {
    if (!confirm('¿Cancelar esta oferta?')) return
    try {
      await cancelarOferta(ligaId!, ofertaId)
      await cargarOfertas()
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Error al cancelar')
    }
  }

  const handleCrearOferta = async (e: FormEvent) => {
    e.preventDefault()
    setOfertaError('')
    setOfertaLoading(true)
    try {
      const dias = Number(ofertaDias)
      await crearOferta(ligaId!, {
        jugadorId: ofertaJugadorId,
        precioMinimo: Number(ofertaPrecio),
        ...(dias > 0 && { diasCaducidad: dias }),
      })
      setMostrarFormOferta(false)
      setOfertaJugadorId('')
      setOfertaPrecio('')
      setOfertaDias('0')
      await Promise.all([cargarOfertas(), cargarEquipo()])
    } catch (err: any) {
      setOfertaError(err.response?.data?.error ?? 'Error al crear la oferta')
    } finally {
      setOfertaLoading(false)
    }
  }

  const ofertasActivasMias = new Set(
    ofertas.filter(o => o.vendedorId === miMiembroId || o.vendedor?.usuario.username === usuario?.username).map(o => o.jugadorId)
  )
  const jugadoresVendibles = miEquipo.filter(je => !je.esTitular && !ofertasActivasMias.has(je.jugadorId))

  if (loading) return <Spinner />

  return (
    <>
    {modalJugador && (
      <JugadorModal
        jugadorId={modalJugador.id}
        nombre={modalJugador.nombre}
        posicion={modalJugador.posicion}
        equipo={modalJugador.equipo}
        ligaId={modalJugador.ligaId}
        onClose={() => setModalJugador(null)}
      />
    )}
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link to={`/ligas/${ligaId}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1">
            ← Volver a la liga
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mercado</h1>
          <p className="text-sm text-gray-500 mt-0.5">{ofertas.length} {ofertas.length === 1 ? 'oferta activa' : 'ofertas activas'}</p>
        </div>
        {jugadoresVendibles.length > 0 && (
          <button
            onClick={() => setMostrarFormOferta(!mostrarFormOferta)}
            className="text-sm px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200"
          >
            + Vender jugador
          </button>
        )}
      </div>

      {/* Formulario crear oferta */}
      {mostrarFormOferta && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Poner jugador a la venta</h2>
          <form onSubmit={handleCrearOferta} className="space-y-4">
            {ofertaError && (
              <div className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                {ofertaError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Jugador</label>
              <select
                value={ofertaJugadorId}
                onChange={e => setOfertaJugadorId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Selecciona un jugador</option>
                {jugadoresVendibles.map(je => {
                  const pos = POS_STYLE[je.jugador.posicion]
                  return (
                    <option key={je.jugadorId} value={je.jugadorId}>
                      [{pos?.label}] {je.jugador.nombre} — {equipoNombre(je.jugador)} · {je.jugador.valor}M
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Precio mínimo (M)</label>
              <input
                type="number"
                value={ofertaPrecio}
                onChange={e => setOfertaPrecio(e.target.value)}
                required min={1}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Duración de la oferta</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { valor: '0',  label: '∞ Sin límite' },
                  { valor: '1',  label: '1 día' },
                  { valor: '3',  label: '3 días' },
                  { valor: '7',  label: '7 días' },
                  { valor: '14', label: '14 días' },
                  { valor: '30', label: '30 días' },
                ].map(op => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setOfertaDias(op.valor)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      ofertaDias === op.valor
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={ofertaLoading}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {ofertaLoading ? 'Publicando...' : 'Publicar oferta'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormOferta(false)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de ofertas */}
      {ofertas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-4">💰</span>
          <p className="text-gray-600 font-medium">No hay jugadores en el mercado</p>
          <p className="text-sm text-gray-400 mt-1">Sé el primero en poner uno a la venta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ofertas.map(oferta => {
            const esMiOferta = oferta.vendedor?.usuario.username === usuario?.username
            const pujandoEsta = pujaOfertaId === oferta.id
            const pos = POS_STYLE[oferta.jugador.posicion] ?? { label: '?', color: 'bg-gray-100 text-gray-600' }

            const caducidad = formatCaducidad(oferta.fechaCaducidad)

            return (
              <div key={oferta.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${esMiOferta ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl font-bold ${pos.color}`}>
                    {pos.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setModalJugador({ id: oferta.jugador.id, nombre: oferta.jugador.nombre, posicion: oferta.jugador.posicion, equipo: equipoNombre(oferta.jugador), ligaId: ligaId ?? undefined })} className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline text-left">
                        {oferta.jugador.nombre}
                      </button>
                      <PtsBadge puntos={ultimaStats?.stats[oferta.jugador.id]?.puntos} />
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {equipoNombre(oferta.jugador)}{oferta.jugador.edad ? ` · ${oferta.jugador.edad} años` : ''}
                      {ultimaStats && ` · J${ultimaStats.numJornada}`}
                    </p>
                    <p className="text-xs mt-1">
                      <span className="text-gray-400">Vende: </span>
                      {oferta.vendedor
                        ? <span className={`font-semibold ${esMiOferta ? 'text-orange-600' : 'text-indigo-500'}`}>
                            {oferta.vendedor.usuario.username}{esMiOferta ? ' (tú)' : ''}
                          </span>
                        : <span className="font-semibold text-gray-400">Sistema</span>
                      }
                    </p>
                    {caducidad && (
                      <p className={`text-xs mt-0.5 font-medium ${caducidad.urgente ? 'text-red-500' : 'text-gray-400'}`}>
                        ⏱ {caducidad.texto}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Precio mín.</p>
                    <p className="text-lg font-bold text-gray-900">{oferta.precioMinimo}M</p>
                  </div>
                </div>

                {/* Estado de pujas — sin importes */}
                <div className={`mt-3 pt-3 border-t ${esMiOferta ? 'border-orange-100' : 'border-gray-50'} flex items-center justify-between`}>
                  <div>
                    {oferta.numPujas > 0 ? (
                      <p className="text-sm font-semibold text-gray-700">
                        {oferta.numPujas} {oferta.numPujas === 1 ? 'puja' : 'pujas'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Sin pujas todavía</p>
                    )}
                    {/* Solo el usuario ve su propia puja */}
                    {oferta.miPuja !== null && !esMiOferta && (
                      <p className="text-xs text-indigo-600 mt-0.5">Tu puja: {oferta.miPuja}M</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!esMiOferta && (
                      <>
                        {oferta.miPuja && !pujandoEsta && (
                          <button
                            onClick={async () => {
                              if (!window.confirm('¿Retirar tu puja de esta oferta?')) return
                              const { retirarPuja } = await import('../api/mercado')
                              retirarPuja(ligaId!, oferta.id)
                                .then(() => cargarOfertas())
                                .catch((err: any) => alert(err.response?.data?.error ?? 'Error al retirar la puja'))
                            }}
                            className="text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors font-medium"
                          >
                            Retirar puja
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPujaOfertaId(pujandoEsta ? null : oferta.id)
                            setPujaError('')
                            setPujaCantidad('')
                          }}
                          className={`text-sm px-4 py-2 rounded-xl font-medium transition-colors ${
                            pujandoEsta
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                          }`}
                        >
                          {pujandoEsta ? 'Cancelar' : oferta.miPuja ? '✏️ Mejorar puja' : '💰 Pujar'}
                        </button>
                      </>
                    )}
                    {esMiOferta && (
                      <>
                        <button
                          onClick={() => handleCerrar(oferta.id)}
                          disabled={oferta.numPujas === 0}
                          className="text-sm px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          ✓ Aceptar
                        </button>
                        <button
                          onClick={() => handleCancelar(oferta.id)}
                          className="text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Formulario de puja inline */}
                {pujandoEsta && (
                  <form onSubmit={e => handlePujar(e, oferta.id)} className="mt-3 pt-3 border-t border-gray-50">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={pujaCantidad}
                        onChange={e => setPujaCantidad(e.target.value)}
                        placeholder={`Mín. ${oferta.miPuja ? oferta.miPuja + 1 : oferta.precioMinimo}M`}
                        min={oferta.miPuja ? oferta.miPuja + 1 : oferta.precioMinimo}
                        required
                        className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={pujaLoading}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {pujaLoading ? '...' : 'Confirmar'}
                      </button>
                    </div>
                    {pujaError && <p className="text-xs text-red-600 mt-1.5">{pujaError}</p>}
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
    </>
  )
}
