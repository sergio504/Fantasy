import api from './client'

export const getRankings = (division: string) =>
  api.get('/explorar/rankings', { params: { division } })
