import { create } from 'zustand'


export type User = {
  address: string
}

type AuthState = {
  token: string | null
  user: User | null
  loginHooks: (token: string, user: User) => void
  logoutHooks: () => void
  hydrate: () => void
  refreshFlag: number
  triggerRefresh: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  loginHooks: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },
  logoutHooks: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },
  hydrate: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    set({ token, user: userStr ? JSON.parse(userStr) : null })
  },
  refreshFlag: 0,
  triggerRefresh: () => set((state) => ({ refreshFlag: state.refreshFlag + 1 })),
}))