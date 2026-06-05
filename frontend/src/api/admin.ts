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
export const simularJornada       = (id: string)    => api.post(`/jornadas/${id}/simular`)
export const calcularPuntuaciones = (id: string)    => api.post(`/jornadas/${id}/calcular`)

// Estadísticas
export const getEstadisticasAdmin = (jornadaId: string) => api.get(`/admin/estadisticas/${jornadaId}`)
export const editarEstadistica    = (id: string, data: object) => api.patch(`/admin/estadisticas/${id}`, data)

// Config puntuación
export const getConfigPuntuacion        = ()                          => api.get('/admin/config-puntuacion')
export const actualizarConfigPuntuacion = (id: string, data: object) => api.patch(`/admin/config-puntuacion/${id}`, data)

// Usuarios
export const getUsuarios         = ()           => api.get('/admin/usuarios')
export const toggleActivoUsuario = (id: string) => api.patch(`/admin/usuarios/${id}/toggle-activo`)

// Mercado automático
export const lanzarMercadoManual = () => api.post('/admin/mercado/lanzar')
