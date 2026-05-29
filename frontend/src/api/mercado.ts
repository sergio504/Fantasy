import api from './client'

export const getOfertas = (ligaId: string) => api.get(`/ligas/${ligaId}/mercado`)
export const crearOferta = (ligaId: string, data: object) => api.post(`/ligas/${ligaId}/mercado`, data)
export const pujar = (ligaId: string, ofertaId: string, cantidad: number) =>
  api.post(`/ligas/${ligaId}/mercado/${ofertaId}/pujar`, { cantidad })
export const cerrarOferta = (ligaId: string, ofertaId: string) =>
  api.post(`/ligas/${ligaId}/mercado/${ofertaId}/cerrar`)
export const cancelarOferta = (ligaId: string, ofertaId: string) =>
  api.delete(`/ligas/${ligaId}/mercado/${ofertaId}`)
