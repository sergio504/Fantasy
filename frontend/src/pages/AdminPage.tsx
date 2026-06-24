import { useEffect, useState } from 'react'
import { getJugadoresAdmin, crearJugador, editarJugador, crearFichaje, cerrarFichaje, getEquipos, getHistorial, getJornadas, crearJornada, editarJornada, simularJornada, generarSnapshot, calcularPuntosPorJugador, calcularPuntuaciones, getEstadisticasAdmin, editarEstadistica, getConfigPuntuacion, actualizarConfigPuntuacion, getConfigEconomia, actualizarConfigEconomia, getConfigRevalorizacion, actualizarConfigRevalorizacion, getUsuarios, toggleActivoUsuario, lanzarMercadoManual, getDashboard, getAliasesEquipos, crearAliasEquipo, eliminarAliasEquipo, getAliasesJugadores, crearAliasJugador, eliminarAliasJugador, getHistorialConfigAdmin } from '../api/admin'
import { DIVISION_LABEL, DIVISIONES } from '../constants/divisiones'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const POSICIONES = ['PORTERO', 'DEFENSA', 'CENTROCAMPISTA', 'DELANTERO', 'UNKNOWN']

interface Equipo { id: string; nombre: string; division: string }
interface Jugador {
  id: string; nombreCompleto: string; nombre: string; dorsal: number | null
  edad: number | null; posicion: string; valor: number
  historialEquipos: { id: string; activo: boolean; equipo: Equipo }[]
}
interface EntradaHistorial {
  id: string; accion: string; entidad: string; entidadId: string
  creadoEn: string; admin: { username: string }
  datosAntes: Record<string, any> | null
  datosDespues: Record<string, any>
}
interface UsuarioAdmin {
  id: string; email: string; username: string; esAdmin: boolean; activo: boolean; creadoEn: string
  _count: { membresias: number; ligasCreadas: number }
}
interface Jornada {
  id: string; division: string; numJornada: number
  fechaInicioJornada: string | null; fechaFinJornada: string | null
  fechaImportacion: string | null
  snapshotGenerado: boolean; statsImportadas: boolean
  puntosPorJugadorCalculados: boolean; puntuacionesCalculadas: boolean
  _count: { estadisticas: number; snapshots: number; puntuaciones: number }
}
interface EstadisticaAdmin {
  id: string; convocado: boolean; titular: boolean; minutosJugados: number
  goles: number; tarjetasAmarillas: number; tarjetaRoja: boolean
  resultado: string; puntosCalculados: number
  jugadorEquipo: { jugador: { nombreCompleto: string; posicion: string }; equipo: { nombre: string } }
}
interface ConfigPuntuacion {
  id: string; posicion: string | null; accion: string; puntos: number; descripcion: string | null
}

interface HistorialConfigEntry {
  id: string
  tipo: string
  campo: string
  valorAnterior: number | null
  valorNuevo: number
  creadoEn: string
  admin: { username: string }
}

interface DashboardData {
  usuarios: { total: number; nuevosUltimaSemana: number; accesosUltimaSemana: number }
  ligas: { publicas: number; privadas: number; total: number }
  jugadores: { total: number }
  mercado: { ofertasActivas: number; ofertasVendidas: number; ofertasCanceladas: number; totalPujas: number }
  registrosPorDia: { dia: string; usuarios: number }[]
}

type Tab = 'dashboard' | 'jugadores' | 'jornadas' | 'estadisticas' | 'config' | 'usuarios' | 'historial' | 'aliases'

interface AliasEquipo  { alias: { id: string; alias: string }; equipo:  { id: string; nombre: string } }
interface AliasJugador { alias: { id: string; alias: string }; jugador: { id: string; nombreCompleto: string } }

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const c = COLOR_CLASSES[color] ?? COLOR_CLASSES.indigo
  return (
    <div className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${c.text}`}>{value.toLocaleString('es-ES')}</p>
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [historial, setHistorial] = useState<EntradaHistorial[]>([])
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticaAdmin[]>([])
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState('')
  const [editandoEstat, setEditandoEstat] = useState<EstadisticaAdmin | null>(null)
  const [formEstat, setFormEstat] = useState<Partial<EstadisticaAdmin>>({})
  const [config, setConfig] = useState<ConfigPuntuacion[]>([])
  const [editandoConfig, setEditandoConfig] = useState<string | null>(null)
  const [configPuntos, setConfigPuntos] = useState<Record<string, string>>({})
  const [configEco, setConfigEco] = useState<{ clave: string; valor: number; descripcion: string; id: string | null }[]>([])
  const [editandoEco, setEditandoEco] = useState<string | null>(null)
  const [ecoValores, setEcoValores] = useState<Record<string, string>>({})
  const [configReval, setConfigReval] = useState<{ id: string | null; orden: number; puntosHasta: number | null; porcentaje: number; descripcion: string }[]>([
    { id: null, orden: 1, puntosHasta: 0,    porcentaje: -8, descripcion: '0 puntos' },
    { id: null, orden: 2, puntosHasta: 4,    porcentaje: -5, descripcion: '1-4 puntos' },
    { id: null, orden: 3, puntosHasta: 8,    porcentaje: -2, descripcion: '5-8 puntos' },
    { id: null, orden: 4, puntosHasta: 12,   porcentaje:  3, descripcion: '9-12 puntos' },
    { id: null, orden: 5, puntosHasta: 17,   porcentaje:  7, descripcion: '13-17 puntos' },
    { id: null, orden: 6, puntosHasta: null, porcentaje: 12, descripcion: '18+ puntos' },
  ])
  const [editandoReval, setEditandoReval] = useState<number | null>(null)
  const [revalValores, setRevalValores] = useState<Record<number, string>>({})
  const [historialConfig, setHistorialConfig] = useState<HistorialConfigEntry[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  // Nueva jornada
  const [formJornada, setFormJornada] = useState({ division: DIVISIONES[0], numJornada: '1', fechaCierre: '' })
  const [mostrarFormJornada, setMostrarFormJornada] = useState(false)

  // Edición de fechas de jornada
  const [filtroDivJornada, setFiltroDivJornada] = useState(DIVISIONES[0])
  const [editandoFechaJornada, setEditandoFechaJornada] = useState<string | null>(null)
  const [formFechaJornada, setFormFechaJornada] = useState({ fechaCierre: '', fechaImportacion: '' })

  // Edición
  const [editando, setEditando] = useState<Jugador | null>(null)
  const [formEdit, setFormEdit] = useState<Partial<Jugador>>({})

  // Nuevo jugador
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ nombreCompleto: '', nombre: '', dorsal: '', edad: '', posicion: 'PORTERO', valor: '' })

  // Fichaje
  const [fichandoId, setFichandoId] = useState<string | null>(null)
  const [fichajeEquipoId, setFichajeEquipoId] = useState('')
  const [fichajeDesde, setFichajeDesde] = useState('')

  const [aliasesEquipos, setAliasesEquipos]     = useState<AliasEquipo[]>([])
  const [aliasesJugadores, setAliasesJugadores] = useState<AliasJugador[]>([])
  const [formAliasEquipo, setFormAliasEquipo]   = useState({ equipoId: '', alias: '' })
  const [formAliasJugador, setFormAliasJugador] = useState({ jugadorId: '', alias: '' })
  const [filtroAliasDiv, setFiltroAliasDiv]     = useState('')
  const [filtroAliasDivJug, setFiltroAliasDivJug] = useState('')
  const [filtroAliasEquipoJug, setFiltroAliasEquipoJug] = useState('')

  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const cargar = async () => {
    const [jRes, eRes] = await Promise.all([getJugadoresAdmin(), getEquipos()])
    setJugadores(jRes.data)
    setEquipos(eRes.data)
  }

  const cargarHistorial = async () => {
    const r = await getHistorial()
    setHistorial(r.data)
  }

  useEffect(() => {
    cargar().finally(() => setLoading(false))
    getDashboard().then(r => setDashboard(r.data))
  }, [])

  useEffect(() => {
    if (tab === 'dashboard') getDashboard().then(r => setDashboard(r.data))
    if (tab === 'historial') cargarHistorial()
    if (tab === 'jornadas' || tab === 'estadisticas') getJornadas().then(r => setJornadas(r.data))
    if (tab === 'config') {
      getConfigPuntuacion().then(r => setConfig(r.data))
      getConfigEconomia().then(r => setConfigEco(r.data))
      getConfigRevalorizacion().then(r => setConfigReval(r.data)).catch(() => {})
      getHistorialConfigAdmin().then(r => setHistorialConfig(r.data)).catch(() => {})
    }
    if (tab === 'usuarios') getUsuarios().then(r => setUsuarios(r.data))
    if (tab === 'aliases') {
      getAliasesEquipos().then(r => setAliasesEquipos(r.data))
      getAliasesJugadores().then(r => setAliasesJugadores(r.data))
    }
  }, [tab])

  const flash = (msg: string, esError = false) => {
    if (esError) setError(msg); else setOk(msg)
    setTimeout(() => { setError(''); setOk('') }, 3000)
  }

  const handleGuardarEdicion = async () => {
    if (!editando) return
    try {
      await editarJugador(editando.id, formEdit)
      flash('Jugador actualizado')
      setEditando(null)
      await cargar()
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Error al guardar', true)
    }
  }

  const handleCrearJugador = async () => {
    try {
      await crearJugador({
        nombreCompleto: formNuevo.nombreCompleto,
        nombre: formNuevo.nombre,
        dorsal: formNuevo.dorsal ? Number(formNuevo.dorsal) : undefined,
        edad: formNuevo.edad ? Number(formNuevo.edad) : undefined,
        posicion: formNuevo.posicion,
        valor: formNuevo.valor ? Number(formNuevo.valor) : 0,
      })
      flash('Jugador creado')
      setMostrarNuevo(false)
      setFormNuevo({ nombreCompleto: '', nombre: '', dorsal: '', edad: '', posicion: 'PORTERO', valor: '' })
      await cargar()
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Error al crear', true)
    }
  }

  const handleCrearFichaje = async (jugadorId: string) => {
    try {
      await crearFichaje({ jugadorId, equipoId: fichajeEquipoId, desde: fichajeDesde || undefined })
      flash('Fichaje registrado')
      setFichandoId(null)
      setFichajeEquipoId('')
      setFichajeDesde('')
      await cargar()
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Error al fichar', true)
    }
  }

  const handleCerrarFichaje = async (fichajeId: string) => {
    if (!confirm('¿Cerrar este fichaje (marcar como inactivo)?')) return
    try {
      await cerrarFichaje(fichajeId)
      flash('Fichaje cerrado')
      await cargar()
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Error al cerrar fichaje', true)
    }
  }

  const jugadoresFiltrados = jugadores.filter(j =>
    j.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
    j.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) return <div className="text-center py-20 text-gray-400">Cargando...</div>

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestión de jugadores y fichajes</p>
      </div>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">⚠️ {error}</div>}
      {ok    && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">✓ {ok}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([['dashboard', '📈 Dashboard'], ['jugadores', '👤 Jugadores'], ['jornadas', '📅 Jornadas'], ['estadisticas', '📊 Estadísticas'], ['config', '⚙️ Config'], ['usuarios', '🔑 Usuarios'], ['historial', '📋 Historial'], ['aliases', '🏷️ Aliases']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              tab === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {!dashboard ? (
            <p className="text-center py-12 text-gray-400 text-sm">Cargando datos...</p>
          ) : (
            <>
              {/* Usuarios */}
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Usuarios</h2>
                <div className="grid grid-cols-3 gap-4">
                  <KpiCard label="Total usuarios" value={dashboard.usuarios.total} color="indigo" />
                  <KpiCard label="Registrados esta semana" value={dashboard.usuarios.nuevosUltimaSemana} color="emerald" />
                  <KpiCard label="Accesos esta semana" value={dashboard.usuarios.accesosUltimaSemana} color="sky" />
                </div>
              </section>

              {/* Ligas y jugadores */}
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ligas y jugadores</h2>
                <div className="grid grid-cols-4 gap-4">
                  <KpiCard label="Total ligas" value={dashboard.ligas.total} color="indigo" />
                  <KpiCard label="Ligas públicas" value={dashboard.ligas.publicas} color="emerald" />
                  <KpiCard label="Ligas privadas" value={dashboard.ligas.privadas} color="amber" />
                  <KpiCard label="Jugadores en BD" value={dashboard.jugadores.total} color="violet" />
                </div>
              </section>

              {/* Mercado */}
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mercado</h2>
                <div className="grid grid-cols-4 gap-4">
                  <KpiCard label="Ofertas activas" value={dashboard.mercado.ofertasActivas} color="emerald" />
                  <KpiCard label="Ofertas vendidas" value={dashboard.mercado.ofertasVendidas} color="indigo" />
                  <KpiCard label="Ofertas canceladas" value={dashboard.mercado.ofertasCanceladas} color="red" />
                  <KpiCard label="Total pujas" value={dashboard.mercado.totalPujas} color="sky" />
                </div>
              </section>

              {/* Gráfico registros */}
              <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Registros últimos 7 días</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dashboard.registrosPorDia} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                      <Tooltip
                        formatter={(v) => [v as number, 'Usuarios']}
                        labelFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      />
                      <Bar dataKey="usuarios" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ── TAB JUGADORES ── */}
      {tab === 'jugadores' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar jugador..."
              className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => setMostrarNuevo(!mostrarNuevo)}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              + Nuevo
            </button>
          </div>

          {/* Formulario nuevo jugador */}
          {mostrarNuevo && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-800">Nuevo jugador</h2>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nombre completo *" value={formNuevo.nombreCompleto}
                  onChange={e => setFormNuevo(p => ({ ...p, nombreCompleto: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input placeholder="Alias / nombre corto *" value={formNuevo.nombre}
                  onChange={e => setFormNuevo(p => ({ ...p, nombre: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={formNuevo.posicion}
                  onChange={e => setFormNuevo(p => ({ ...p, posicion: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {POSICIONES.map(p => <option key={p}>{p}</option>)}
                </select>
                <input placeholder="Dorsal" type="number" value={formNuevo.dorsal}
                  onChange={e => setFormNuevo(p => ({ ...p, dorsal: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input placeholder="Edad" type="number" value={formNuevo.edad}
                  onChange={e => setFormNuevo(p => ({ ...p, edad: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input placeholder="Valor (M)" type="number" value={formNuevo.valor}
                  onChange={e => setFormNuevo(p => ({ ...p, valor: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCrearJugador}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  Crear jugador
                </button>
                <button onClick={() => setMostrarNuevo(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista jugadores */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {jugadoresFiltrados.map(j => {
                const fichajeActivo = j.historialEquipos.find(h => h.activo)
                const esEditando = editando?.id === j.id
                const esFichando = fichandoId === j.id

                return (
                  <div key={j.id} className="px-5 py-4">
                    {/* Fila principal */}
                    {!esEditando ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{j.nombreCompleto}</p>
                          <p className="text-xs text-gray-500">
                            {j.posicion} · {fichajeActivo ? `${fichajeActivo.equipo.nombre} (${DIVISION_LABEL[fichajeActivo.equipo.division] ?? fichajeActivo.equipo.division})` : 'Sin equipo'}
                            {j.dorsal ? ` · Dorsal ${j.dorsal}` : ''}
                            {j.edad ? ` · ${j.edad} años` : ''}
                            {` · ${j.valor}M`}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => { setEditando(j); setFormEdit({ nombreCompleto: j.nombreCompleto, nombre: j.nombre, dorsal: j.dorsal, edad: j.edad, posicion: j.posicion, valor: j.valor }) }}
                            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            Editar
                          </button>
                          <button onClick={() => setFichandoId(esFichando ? null : j.id)}
                            className="text-xs px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
                            Fichaje
                          </button>
                          {fichajeActivo && (
                            <button onClick={() => handleCerrarFichaje(fichajeActivo.id)}
                              className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                              Dar de baja
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Formulario edición inline */
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editando: {j.nombreCompleto}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Nombre completo" value={formEdit.nombreCompleto ?? ''}
                            onChange={e => setFormEdit(p => ({ ...p, nombreCompleto: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input placeholder="Alias" value={formEdit.nombre ?? ''}
                            onChange={e => setFormEdit(p => ({ ...p, nombre: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <select value={formEdit.posicion ?? 'PORTERO'}
                            onChange={e => setFormEdit(p => ({ ...p, posicion: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {POSICIONES.map(p => <option key={p}>{p}</option>)}
                          </select>
                          <input placeholder="Dorsal" type="number" value={formEdit.dorsal ?? ''}
                            onChange={e => setFormEdit(p => ({ ...p, dorsal: e.target.value ? Number(e.target.value) : null }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input placeholder="Edad" type="number" value={formEdit.edad ?? ''}
                            onChange={e => setFormEdit(p => ({ ...p, edad: e.target.value ? Number(e.target.value) : null }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input placeholder="Valor (M)" type="number" value={formEdit.valor ?? ''}
                            onChange={e => setFormEdit(p => ({ ...p, valor: Number(e.target.value) }))}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleGuardarEdicion}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                            Guardar
                          </button>
                          <button onClick={() => setEditando(null)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formulario fichaje inline */}
                    {esFichando && !esEditando && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nuevo fichaje</p>
                        <div className="flex gap-2">
                          <select value={fichajeEquipoId} onChange={e => setFichajeEquipoId(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Selecciona equipo</option>
                            {equipos.map(e => (
                              <option key={e.id} value={e.id}>
                                {e.nombre} ({DIVISION_LABEL[e.division] ?? e.division})
                              </option>
                            ))}
                          </select>
                          <input type="date" value={fichajeDesde} onChange={e => setFichajeDesde(e.target.value)}
                            title="Fecha de inicio (opcional)"
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <button onClick={() => handleCrearFichaje(j.id)} disabled={!fichajeEquipoId}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                            Confirmar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {jugadoresFiltrados.length === 0 && (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No se encontraron jugadores</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB JORNADAS ── */}
      {tab === 'jornadas' && (
        <div>
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={async () => {
                if (!confirm('¿Lanzar el mercado automático ahora? Se añadirán hasta 15 jugadores por liga si no hay ofertas recientes.')) return
                try {
                  const r = await lanzarMercadoManual()
                  flash(`${r.data.mensaje}`)
                } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
              }}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              🛒 Lanzar mercado ahora
            </button>
            <button onClick={() => setMostrarFormJornada(!mostrarFormJornada)}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              + Nueva jornada
            </button>
          </div>

          {mostrarFormJornada && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-800">Nueva jornada</h2>
              <div className="grid grid-cols-3 gap-3">
                <select value={formJornada.division} onChange={e => setFormJornada(p => ({ ...p, division: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DIVISIONES.map(d => <option key={d} value={d}>{DIVISION_LABEL[d]}</option>)}
                </select>
                <input type="number" placeholder="Nº jornada" value={formJornada.numJornada}
                  onChange={e => setFormJornada(p => ({ ...p, numJornada: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="datetime-local" value={formJornada.fechaCierre}
                  onChange={e => setFormJornada(p => ({ ...p, fechaCierre: e.target.value }))}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  try {
                    await crearJornada({ division: formJornada.division, numJornada: Number(formJornada.numJornada), fechaCierre: formJornada.fechaCierre })
                    flash('Jornada creada')
                    setMostrarFormJornada(false)
                    const r = await getJornadas(); setJornadas(r.data)
                  } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  Crear
                </button>
                <button onClick={() => setMostrarFormJornada(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {jornadas.map(j => {
                const recargar = async () => { const jr = await getJornadas(); setJornadas(jr.data) }
                const paso = (hecho: boolean, label: string) => (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${hecho ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {hecho ? '✓' : '○'} {label}
                  </span>
                )
                return (
                  <div key={j.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          Jornada {j.numJornada} · {DIVISION_LABEL[j.division] ?? j.division}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Inicio: {j.fechaInicioJornada ? new Date(j.fechaInicioJornada).toLocaleString('es-ES') : '—'}
                          {j.fechaImportacion && <> · Import: {new Date(j.fechaImportacion).toLocaleString('es-ES')}</>}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {paso(j.snapshotGenerado,           'Snapshot')}
                          {paso(j.statsImportadas,            'Stats')}
                          {paso(j.puntosPorJugadorCalculados, 'Pts jugador')}
                          {paso(j.puntuacionesCalculadas,     'Clasificación')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0 items-end">
                        <button
                          onClick={async () => {
                            try { const r = await generarSnapshot(j.id); flash(r.data.mensaje); await recargar() }
                            catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                          }}
                          disabled={j.snapshotGenerado}
                          className="text-xs px-3 py-1.5 rounded-xl border border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          Snapshot
                        </button>
                        <button
                          onClick={async () => {
                            try { const r = await simularJornada(j.id); flash(r.data.mensaje); await recargar() }
                            catch (e: any) { flash(e.response?.data?.error ?? 'Error al simular', true) }
                          }}
                          disabled={j.statsImportadas || j._count.estadisticas > 0}
                          className="text-xs px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          Simular stats
                        </button>
                        <button
                          onClick={async () => {
                            try { const r = await calcularPuntosPorJugador(j.id); flash(r.data.mensaje); await recargar() }
                            catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                          }}
                          disabled={j._count.estadisticas === 0 || j.puntosPorJugadorCalculados}
                          className="text-xs px-3 py-1.5 rounded-xl border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          Calcular pts jugador
                        </button>
                        <button
                          onClick={async () => {
                            try { const r = await calcularPuntuaciones(j.id); flash(r.data.mensaje); await recargar() }
                            catch (e: any) { flash(e.response?.data?.error ?? 'Error al calcular', true) }
                          }}
                          disabled={!j.puntosPorJugadorCalculados || j.puntuacionesCalculadas}
                          className="text-xs px-3 py-1.5 rounded-xl border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          Calcular clasificación
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {jornadas.length === 0 && (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No hay jornadas creadas</p>
              )}
            </div>
          </div>

          {/* ── Editar fechas ── */}
          <div className="mt-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Editar fechas</h2>
            <div className="flex gap-2 mb-3">
              {DIVISIONES.map(d => (
                <button key={d} onClick={() => setFiltroDivJornada(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filtroDivJornada === d ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {DIVISION_LABEL[d]}
                </button>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {jornadas.filter(j => j.division === filtroDivJornada).length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No hay jornadas en esta división</p>
              ) : jornadas.filter(j => j.division === filtroDivJornada).map(j => {
                const editando = editandoFechaJornada === j.id
                const fmtLocal = (iso: string) => iso ? iso.slice(0, 16) : ''
                return (
                  <div key={j.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-semibold text-gray-900 w-20 shrink-0">Jornada {j.numJornada}</span>
                    {editando ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-400">Cierre (snapshot)</span>
                          <input type="datetime-local" value={formFechaJornada.fechaCierre}
                            onChange={e => setFormFechaJornada(p => ({ ...p, fechaCierre: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-gray-400">Importación (scraper)</span>
                          <input type="datetime-local" value={formFechaJornada.fechaImportacion}
                            onChange={e => setFormFechaJornada(p => ({ ...p, fechaImportacion: e.target.value }))}
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={async () => {
                            try {
                              await editarJornada(j.id, {
                                fechaCierre:      formFechaJornada.fechaCierre      || undefined,
                                fechaImportacion: formFechaJornada.fechaImportacion || null,
                              })
                              flash('Fechas actualizadas')
                              const jr = await getJornadas(); setJornadas(jr.data)
                              setEditandoFechaJornada(null)
                            } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                          }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                            Guardar
                          </button>
                          <button onClick={() => setEditandoFechaJornada(null)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1 text-xs text-gray-500 space-y-0.5">
                          <p>Cierre: <span className="text-gray-800">{new Date(j.fechaCierre).toLocaleString('es-ES')}</span></p>
                          <p>Import: <span className="text-gray-800">{j.fechaImportacion ? new Date(j.fechaImportacion).toLocaleString('es-ES') : '—'}</span></p>
                        </div>
                        <button onClick={() => {
                          setEditandoFechaJornada(j.id)
                          setFormFechaJornada({
                            fechaCierre:      fmtLocal(new Date(j.fechaCierre).toISOString()),
                            fechaImportacion: j.fechaImportacion ? fmtLocal(new Date(j.fechaImportacion).toISOString()) : '',
                          })
                        }} className="text-xs text-indigo-600 hover:text-indigo-800">
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB ESTADÍSTICAS ── */}
      {tab === 'estadisticas' && (
        <div>
          <div className="flex gap-2 mb-4">
            <select
              value={jornadaSeleccionada}
              onChange={async e => {
                setJornadaSeleccionada(e.target.value)
                setEditandoEstat(null)
                if (e.target.value) {
                  const r = await getEstadisticasAdmin(e.target.value)
                  setEstadisticas(r.data)
                } else {
                  setEstadisticas([])
                }
              }}
              className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecciona una jornada...</option>
              {jornadas.map(j => (
                <option key={j.id} value={j.id}>
                  Jornada {j.numJornada} — {DIVISION_LABEL[j.division] ?? j.division}
                </option>
              ))}
            </select>
          </div>

          {estadisticas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {estadisticas.map(e => {
                  const esEditando = editandoEstat?.id === e.id
                  return (
                    <div key={e.id} className="px-5 py-3">
                      {!esEditando ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{e.jugadorEquipo.jugador.nombreCompleto}</p>
                            <p className="text-xs text-gray-500">
                              {e.jugadorEquipo.jugador.posicion} · {e.jugadorEquipo.equipo.nombre}
                              {' · '}{e.convocado ? (e.titular ? `Titular ${e.minutosJugados}'` : 'Convocado') : 'No conv.'}
                              {e.goles > 0 && ` · ⚽${e.goles}`}
                              {e.tarjetasAmarillas > 0 && ' · 🟨'}
                              {e.tarjetaRoja && ' · 🟥'}
                              {' · '}{e.resultado}
                            </p>
                          </div>
                          <span className={`text-sm font-bold shrink-0 ${e.puntosCalculados >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                            {e.puntosCalculados} pts
                          </span>
                          <button
                            onClick={() => { setEditandoEstat(e); setFormEstat({ convocado: e.convocado, titular: e.titular, minutosJugados: e.minutosJugados, goles: e.goles, tarjetasAmarillas: e.tarjetasAmarillas, tarjetaRoja: e.tarjetaRoja, resultado: e.resultado as any }) }}
                            className="shrink-0 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Editar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{e.jugadorEquipo.jugador.nombreCompleto}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input type="checkbox" checked={!!formEstat.convocado} onChange={ev => setFormEstat(p => ({ ...p, convocado: ev.target.checked, titular: ev.target.checked ? p.titular : false }))} />
                              Convocado
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input type="checkbox" checked={!!formEstat.titular} disabled={!formEstat.convocado} onChange={ev => setFormEstat(p => ({ ...p, titular: ev.target.checked }))} />
                              Titular
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input type="checkbox" checked={!!formEstat.tarjetaRoja} onChange={ev => setFormEstat(p => ({ ...p, tarjetaRoja: ev.target.checked }))} />
                              Tarjeta roja
                            </label>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Minutos</label>
                              <input type="number" min={0} max={120} value={formEstat.minutosJugados ?? 0} onChange={ev => setFormEstat(p => ({ ...p, minutosJugados: Number(ev.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Goles</label>
                              <input type="number" min={0} max={10} value={formEstat.goles ?? 0} onChange={ev => setFormEstat(p => ({ ...p, goles: Number(ev.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Amarillas</label>
                              <input type="number" min={0} max={2} value={formEstat.tarjetasAmarillas ?? 0} onChange={ev => setFormEstat(p => ({ ...p, tarjetasAmarillas: Number(ev.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Resultado del equipo</label>
                            <div className="flex gap-2">
                              {['VICTORIA', 'EMPATE', 'DERROTA'].map(r => (
                                <button key={r} type="button" onClick={() => setFormEstat(p => ({ ...p, resultado: r as any }))}
                                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${formEstat.resultado === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                  {r === 'VICTORIA' ? 'Victoria' : r === 'EMPATE' ? 'Empate' : 'Derrota'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const r = await editarEstadistica(e.id, formEstat)
                                  flash(`Guardado. Diferencia: ${r.data.diferencia > 0 ? '+' : ''}${r.data.diferencia} pts`)
                                  const r2 = await getEstadisticasAdmin(jornadaSeleccionada)
                                  setEstadisticas(r2.data)
                                  setEditandoEstat(null)
                                } catch (err: any) { flash(err.response?.data?.error ?? 'Error', true) }
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                            >
                              Guardar y recalcular
                            </button>
                            <button onClick={() => setEditandoEstat(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {jornadaSeleccionada && estadisticas.length === 0 && (
            <p className="text-center py-8 text-sm text-gray-400">Esta jornada no tiene estadísticas generadas</p>
          )}
        </div>
      )}

      {/* ── TAB CONFIG PUNTOS ── */}
      {tab === 'config' && (
        <div className="space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Puntuación por acción</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="text-xs text-gray-400">Al guardar se crea una nueva versión manteniendo el historial anterior.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {config.map(c => {
              const esEditando = editandoConfig === c.id
              return (
                <div key={c.id} className="flex items-center px-5 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.accion.replace(/_/g, ' ')}
                      {c.posicion && <span className="ml-2 text-xs text-indigo-600 font-normal">({c.posicion})</span>}
                    </p>
                    {c.descripcion && <p className="text-xs text-gray-400">{c.descripcion}</p>}
                  </div>
                  {esEditando ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        value={configPuntos[c.id] ?? String(c.puntos)}
                        onChange={e => setConfigPuntos(p => ({ ...p, [c.id]: e.target.value }))}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-400">pts</span>
                      <button
                        onClick={async () => {
                          try {
                            await actualizarConfigPuntuacion(c.id, { puntos: Number(configPuntos[c.id]) })
                            flash('Configuración actualizada')
                            const r = await getConfigPuntuacion(); setConfig(r.data)
                            setEditandoConfig(null)
                          } catch (err: any) { flash(err.response?.data?.error ?? 'Error', true) }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Guardar
                      </button>
                      <button onClick={() => setEditandoConfig(null)} className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-base font-extrabold ${c.puntos > 0 ? 'text-green-600' : c.puntos < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {c.puntos > 0 ? '+' : ''}{c.puntos}
                      </span>
                      <button
                        onClick={() => { setEditandoConfig(c.id); setConfigPuntos(p => ({ ...p, [c.id]: String(c.puntos) })) }}
                        className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        </div>

        {/* ── Config economía ── */}
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ingresos por jornada</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {configEco.map(c => {
                const editando = editandoEco === c.clave
                return (
                  <div key={c.clave} className="flex items-center px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.clave.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400">{c.descripcion}</p>
                    </div>
                    {editando ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" value={ecoValores[c.clave] ?? String(c.valor)}
                          onChange={e => setEcoValores(p => ({ ...p, [c.clave]: e.target.value }))}
                          className="w-28 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={async () => {
                          try {
                            await actualizarConfigEconomia(c.clave, { valor: Number(ecoValores[c.clave]) })
                            flash('Actualizado')
                            const r = await getConfigEconomia(); setConfigEco(r.data)
                            setEditandoEco(null)
                          } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                        }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                          Guardar
                        </button>
                        <button onClick={() => setEditandoEco(null)} className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-extrabold text-indigo-600">{c.valor.toLocaleString('es-ES')}</span>
                        <button onClick={() => { setEditandoEco(c.clave); setEcoValores(p => ({ ...p, [c.clave]: String(c.valor) })) }}
                          className="text-xs text-indigo-600 hover:text-indigo-800">Editar</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Config revalorización ── */}
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Revalorización de jugadores</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {configReval.map(c => {
                const editando = editandoReval === c.orden
                return (
                  <div key={c.orden} className="flex items-center px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.descripcion}</p>
                      <p className="text-xs text-gray-400">
                        {c.puntosHasta === null ? 'Sin límite superior' : `Hasta ${c.puntosHasta} puntos`}
                      </p>
                    </div>
                    {editando ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" value={revalValores[c.orden] ?? String(c.porcentaje)}
                          onChange={e => setRevalValores(p => ({ ...p, [c.orden]: e.target.value }))}
                          className="w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <span className="text-sm text-gray-500">%</span>
                        <button onClick={async () => {
                          if (!c.id) { flash('Primero ejecuta el SQL de inicialización', true); return }
                          try {
                            await actualizarConfigRevalorizacion(c.id, { porcentaje: Number(revalValores[c.orden]) })
                            flash('Actualizado')
                            const r = await getConfigRevalorizacion(); setConfigReval(r.data)
                            setEditandoReval(null)
                          } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                        }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                          Guardar
                        </button>
                        <button onClick={() => setEditandoReval(null)} className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-extrabold ${c.porcentaje >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {c.porcentaje >= 0 ? '+' : ''}{c.porcentaje}%
                        </span>
                        <button onClick={() => { setEditandoReval(c.orden); setRevalValores(p => ({ ...p, [c.orden]: String(c.porcentaje) })) }}
                          className="text-xs text-indigo-600 hover:text-indigo-800">Editar</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Historial de cambios de config ── */}
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historial de cambios</h2>
          {historialConfig.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin cambios registrados aún.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {[...historialConfig].reverse().map(h => {
                  const tipoBadge =
                    h.tipo === 'PUNTUACION' ? 'bg-indigo-100 text-indigo-700'
                    : h.tipo === 'ECONOMIA' ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                  return (
                    <div key={h.id} className="flex items-center px-5 py-3 gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold shrink-0 ${tipoBadge}`}>
                        {h.tipo === 'PUNTUACION' ? 'Punt.' : h.tipo === 'ECONOMIA' ? 'Econ.' : 'Reval.'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{h.campo}</p>
                        <p className="text-xs text-gray-400">
                          {h.valorAnterior != null ? `${h.valorAnterior} → ` : '— → '}{h.valorNuevo}
                          <span className="ml-2">· {h.admin.username}</span>
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(h.creadoEn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* ── TAB USUARIOS ── */}
      {tab === 'usuarios' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {usuarios.map(u => (
              <div key={u.id} className={`flex items-center px-5 py-3 gap-3 ${!u.activo ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{u.username}</p>
                    {u.esAdmin && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Admin</span>}
                    {!u.activo && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    {u.email} · {u._count.membresias} liga{u._count.membresias !== 1 ? 's' : ''} · creado {new Date(u.creadoEn).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const accion = u.activo ? 'desactivar' : 'reactivar'
                    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${u.username}?`)) return
                    try {
                      await toggleActivoUsuario(u.id)
                      flash(`${u.username} ${u.activo ? 'desactivado' : 'reactivado'}`)
                      const r = await getUsuarios(); setUsuarios(r.data)
                    } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
                  }}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                    u.activo
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {u.activo ? 'Desactivar' : 'Reactivar'}
                </button>
              </div>
            ))}
            {usuarios.length === 0 && <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin usuarios</p>}
          </div>
        </div>
      )}

      {/* ── TAB HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {historial.map(h => {
              const a = h.datosAntes
              const d = h.datosDespues

              // Descripción del objeto afectado
              const sujeto: string = (() => {
                switch (h.accion) {
                  case 'CREAR_JUGADOR':
                  case 'EDITAR_JUGADOR': return d.nombreCompleto ?? a?.nombreCompleto ?? h.entidadId.slice(0, 8)
                  case 'CREAR_FICHAJE':
                  case 'CERRAR_FICHAJE': return `${d.jugador?.nombreCompleto ?? a?.jugador?.nombreCompleto ?? '?'} → ${d.equipo?.nombre ?? a?.equipo?.nombre ?? '?'}`
                  case 'EDITAR_ESTADISTICA': return `${a?.jugadorEquipo?.jugador?.nombreCompleto ?? '?'} — Jornada ${a?.jornada?.numJornada ?? '?'}`
                  case 'ACTUALIZAR_CONFIG': return `${d.accion?.replace(/_/g, ' ')}${d.posicion ? ` (${d.posicion})` : ''}`
                  case 'CREAR_JORNADA': return `Jornada ${d.numJornada} — ${d.division?.replace(/_/g, ' ')}`
                  case 'GENERAR_SNAPSHOT': return `Jornada — ${d.total} snapshots`
                  case 'SIMULAR_JORNADA': return `Jornada — ${d.total} estadísticas`
                  case 'CALCULAR_PUNTUACIONES': return `Jornada — ${d.equipos} equipos`
                  default: return h.entidadId.slice(0, 8) + '…'
                }
              })()

              // Diff de cambios
              const diff: string[] = (() => {
                if (!a) return []
                const CAMPOS_STATS = ['convocado', 'titular', 'minutosJugados', 'goles', 'tarjetasAmarillas', 'tarjetaRoja', 'resultado', 'puntosCalculados']
                const CAMPOS_JUGADOR = ['nombreCompleto', 'nombre', 'dorsal', 'edad', 'posicion', 'valor']
                const campos = h.accion === 'EDITAR_ESTADISTICA' ? CAMPOS_STATS
                  : (h.accion === 'EDITAR_JUGADOR' || h.accion === 'CREAR_JUGADOR') ? CAMPOS_JUGADOR
                  : h.accion === 'ACTUALIZAR_CONFIG' ? ['puntos', 'descripcion']
                  : []
                return campos
                  .filter(k => a[k] !== undefined && d[k] !== undefined && String(a[k]) !== String(d[k]))
                  .map(k => `${k}: ${a[k]} → ${d[k]}`)
              })()

              return (
                <div key={h.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold mt-0.5 ${
                      h.accion.startsWith('CREAR') || h.accion === 'GENERAR_SNAPSHOT' ? 'bg-green-100 text-green-700'
                      : h.accion.startsWith('EDITAR') || h.accion === 'ACTUALIZAR_CONFIG' ? 'bg-blue-100 text-blue-700'
                      : h.accion === 'SIMULAR_JORNADA' ? 'bg-purple-100 text-purple-700'
                      : h.accion === 'CALCULAR_PUNTUACIONES' ? 'bg-amber-100 text-amber-700'
                      : h.accion === 'CERRAR_FICHAJE' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {({
                        CREAR_JUGADOR: 'Nuevo jugador', EDITAR_JUGADOR: 'Editar jugador',
                        CREAR_FICHAJE: 'Fichaje', CERRAR_FICHAJE: 'Baja',
                        EDITAR_ESTADISTICA: 'Editar stats', ACTUALIZAR_CONFIG: 'Config puntos',
                        CREAR_JORNADA: 'Nueva jornada', GENERAR_SNAPSHOT: 'Snapshot',
                        SIMULAR_JORNADA: 'Simulación', CALCULAR_PUNTUACIONES: 'Puntuaciones',
                      } as Record<string, string>)[h.accion] ?? h.accion.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{h.admin.username}</span>
                        <span className="text-gray-400"> · </span>
                        <span>{sujeto}</span>
                      </p>
                      {diff.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {diff.map((linea, i) => (
                            <p key={i} className="text-xs font-mono text-gray-500">{linea}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{new Date(h.creadoEn).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                </div>
              )
            })}
            {historial.length === 0 && (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin acciones registradas</p>
            )}
          </div>
        </div>
      )}
      {/* ── TAB ALIASES ── */}
      {tab === 'aliases' && (
        <div className="space-y-8">

          {/* Aliases de equipos */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Aliases de equipos</h2>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
              {aliasesEquipos.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin aliases definidos</p>
              ) : aliasesEquipos.map(({ alias, equipo: eq }) => (
                <div key={alias.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{alias.alias}</span>
                    <span className="text-xs text-gray-400 ml-2">→ {eq.nombre}</span>
                  </div>
                  <button onClick={async () => {
                    await eliminarAliasEquipo(alias.id)
                    setAliasesEquipos(prev => prev.filter(a => a.alias.id !== alias.id))
                    flash('Alias eliminado')
                  }} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                </div>
              ))}
            </div>
            {/* Formulario con filtro por división */}
            <div className="flex gap-2 flex-wrap">
              <select value={filtroAliasDiv} onChange={e => {
                setFiltroAliasDiv(e.target.value)
                setFormAliasEquipo(p => ({ ...p, equipoId: '' }))
              }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Todas las divisiones</option>
                {DIVISIONES.map(d => <option key={d} value={d}>{DIVISION_LABEL[d]}</option>)}
              </select>
              <select value={formAliasEquipo.equipoId} onChange={e => setFormAliasEquipo(p => ({ ...p, equipoId: e.target.value }))}
                className="flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Selecciona equipo...</option>
                {equipos
                  .filter(e => !filtroAliasDiv || e.division === filtroAliasDiv)
                  .map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <input value={formAliasEquipo.alias} onChange={e => setFormAliasEquipo(p => ({ ...p, alias: e.target.value }))}
                placeholder="Alias del scraper" className="flex-1 min-w-[160px] border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <button onClick={async () => {
                if (!formAliasEquipo.equipoId || !formAliasEquipo.alias) return
                try {
                  const r = await crearAliasEquipo(formAliasEquipo)
                  const eq = equipos.find(e => e.id === formAliasEquipo.equipoId)!
                  setAliasesEquipos(prev => [...prev, { alias: r.data, equipo: { id: eq.id, nombre: eq.nombre } }])
                  setFormAliasEquipo({ equipoId: '', alias: '' })
                  flash('Alias creado')
                } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
              }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                Añadir
              </button>
            </div>
          </section>

          {/* Aliases de jugadores */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Aliases de jugadores</h2>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
              {aliasesJugadores.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin aliases definidos</p>
              ) : aliasesJugadores.map(({ alias, jugador: jug }) => (
                <div key={alias.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{alias.alias}</span>
                    <span className="text-xs text-gray-400 ml-2">→ {jug.nombreCompleto}</span>
                  </div>
                  <button onClick={async () => {
                    await eliminarAliasJugador(alias.id)
                    setAliasesJugadores(prev => prev.filter(a => a.alias.id !== alias.id))
                    flash('Alias eliminado')
                  }} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                </div>
              ))}
            </div>
            {/* Formulario con filtros por división y equipo */}
            <div className="flex gap-2 flex-wrap">
              <select value={filtroAliasDivJug} onChange={e => {
                setFiltroAliasDivJug(e.target.value)
                setFiltroAliasEquipoJug('')
                setFormAliasJugador(p => ({ ...p, jugadorId: '' }))
              }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Todas las divisiones</option>
                {DIVISIONES.map(d => <option key={d} value={d}>{DIVISION_LABEL[d]}</option>)}
              </select>
              <select value={filtroAliasEquipoJug} onChange={e => {
                setFiltroAliasEquipoJug(e.target.value)
                setFormAliasJugador(p => ({ ...p, jugadorId: '' }))
              }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Todos los equipos</option>
                {equipos
                  .filter(e => !filtroAliasDivJug || e.division === filtroAliasDivJug)
                  .map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <select value={formAliasJugador.jugadorId} onChange={e => setFormAliasJugador(p => ({ ...p, jugadorId: e.target.value }))}
                className="flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="">Selecciona jugador...</option>
                {jugadores
                  .filter(j => {
                    const activo = j.historialEquipos.find(h => h.activo)
                    if (!activo) return false
                    if (filtroAliasEquipoJug && activo.equipo.id !== filtroAliasEquipoJug) return false
                    if (filtroAliasDivJug && activo.equipo.division !== filtroAliasDivJug) return false
                    return true
                  })
                  .map(j => <option key={j.id} value={j.id}>{j.nombreCompleto}</option>)}
              </select>
              <input value={formAliasJugador.alias} onChange={e => setFormAliasJugador(p => ({ ...p, alias: e.target.value }))}
                placeholder="Alias del scraper" className="flex-1 min-w-[160px] border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <button onClick={async () => {
                if (!formAliasJugador.jugadorId || !formAliasJugador.alias) return
                try {
                  const r = await crearAliasJugador(formAliasJugador)
                  const jug = jugadores.find(j => j.id === formAliasJugador.jugadorId)!
                  setAliasesJugadores(prev => [...prev, { alias: r.data, jugador: { id: jug.id, nombreCompleto: jug.nombreCompleto } }])
                  setFormAliasJugador({ jugadorId: '', alias: '' })
                  flash('Alias creado')
                } catch (e: any) { flash(e.response?.data?.error ?? 'Error', true) }
              }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                Añadir
              </button>
            </div>
          </section>

        </div>
      )}

    </main>
  )
}
