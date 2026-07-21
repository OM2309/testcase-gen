import axios from 'axios'
import { getSession } from 'next-auth/react'

const API_BASE_URL = 'http://localhost:5000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const session = await getSession()
    const token = (session as any)?.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
}, (error) => {
  return Promise.reject(error)
})
