import api from './client'

export const getJugadoresAdmin  = ()              => api.get('/admin/jugadores')
export const crearJugador        = (data: object)  => api.post('/admin/jugadores', data)
export const editarJugador       = (id: string, data: object) => api.patch(`/admin/jugadores/${id}`, data)

export const crearFichaje        = (data: object)  => api.post('/admin/fichajes', data)
export const cerrarFichaje       = (id: string, data?: object) => api.patch(`/admin/fichajes/${id}/cerrar`, data ?? {})

export const getEquipos          = ()              => api.get('/admin/equipos')
export const getHistorial        = ()              => api.get('/admin/historial')

// Jornadas
export const getJornadas          = (division?: string) => api.get('/jornadas', { params: division ? { division } : {} })
export const crearJornada         = (data: object)  => api.post('/jornadas', data)
export const editarJornada        = (id: string, data: object) => api.patch(`/jornadas/${id}`, data)
export const simularJornada       = (id: string)    => api.post(`/jornadas/${id}/simular`)
export const generarSnapshot      = (id: string)    => api.post(`/jornadas/${id}/snapshot`)
export const calcularPuntosPorJugador = (id: string) => api.post(`/jornadas/${id}/calcular-puntos`)
export const calcularPuntuaciones     = (id: string) => api.post(`/jornadas/${id}/calcular`)

// Estadísticas
export const getEstadisticasAdmin = (jornadaId: string) => api.get(`/admin/estadisticas/${jornadaId}`)
export const editarEstadistica    = (id: string, data: object) => api.patch(`/admin/estadisticas/${id}`, data)

// Config puntuación
export const getConfigPuntuacion        = ()                          => api.get('/admin/config-puntuacion')
export const actualizarConfigPuntuacion = (id: string, data: object) => api.patch(`/admin/config-puntuacion/${id}`, data)

export const getConfigEconomia          = ()                             => api.get('/admin/config-economia')
export const actualizarConfigEconomia   = (clave: string, data: object) => api.patch(`/admin/config-economia/${clave}`, data)

export const getConfigRevalorizacion        = ()                           => api.get('/admin/config-revalorizacion')
export const actualizarConfigRevalorizacion = (id: string, data: object)  => api.patch(`/admin/config-revalorizacion/${id}`, data)
export const getHistorialConfigAdmin        = ()                           => api.get('/admin/historial-config')

// Usuarios
export const getUsuarios         = ()           => api.get('/admin/usuarios')
export const toggleActivoUsuario = (id: string) => api.patch(`/admin/usuarios/${id}/toggle-activo`)

// Mercado automático
export const lanzarMercadoManual = () => api.post('/admin/mercado/lanzar')

// Dashboard
export const getDashboard = () => api.get('/admin/dashboard')

// Aliases
export const getAliasesEquipos    = ()                          => api.get('/admin/aliases/equipos')
export const crearAliasEquipo     = (data: object)              => api.post('/admin/aliases/equipos', data)
export const eliminarAliasEquipo  = (id: string)                => api.delete(`/admin/aliases/equipos/${id}`)
export const getAliasesJugadores  = ()                          => api.get('/admin/aliases/jugadores')
export const crearAliasJugador    = (data: object)              => api.post('/admin/aliases/jugadores', data)
export const eliminarAliasJugador = (id: string)                => api.delete(`/admin/aliases/jugadores/${id}`)
