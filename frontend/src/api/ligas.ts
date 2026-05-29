import api from './client'

export const getLigasPublicas = () => api.get('/ligas')
export const getMisLigas = () => api.get('/ligas/mis-ligas')
export const getLiga = (ligaId: string) => api.get(`/ligas/${ligaId}`)
export const crearLiga = (data: object) => api.post('/ligas', data)
export const unirseALiga = (ligaId: string) => api.post(`/ligas/unirse/${ligaId}`)
export const unirseConCodigo = (codigo: string) => api.post('/ligas/unirse-con-codigo', { codigo })
export const getMiEquipo = (ligaId: string) => api.get(`/ligas/${ligaId}/mi-equipo`)
export const getJugadoresDisponibles = (ligaId: string) => api.get(`/ligas/${ligaId}/jugadores-disponibles`)
export const getTransferencias = (ligaId: string) => api.get(`/ligas/${ligaId}/transferencias`)
export const getAlineacion = (ligaId: string) => api.get(`/ligas/${ligaId}/mi-alineacion`)
export const guardarAlineacion = (ligaId: string, data: { formacion: string; jugadorIds: string[]; capitanId: string | null }) =>
  api.post(`/ligas/${ligaId}/mi-alineacion`, data)
