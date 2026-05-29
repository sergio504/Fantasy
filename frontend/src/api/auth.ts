import api from './client'

export const register = (email: string, username: string, password: string) =>
  api.post('/auth/register', { email, username, password })

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })
