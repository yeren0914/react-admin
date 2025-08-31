import { create } from 'zustand'


export type User = {
    id: string
    name: string
    avatar?: string
    roles?: string[]
}


type AuthState = {
    token: string | null
    user: User | null
    login: (token: string, user: User) => void
    logout: () => void
    hydrate: () => void
}


export const useAuth = create<AuthState>((set) => ({
    token: null,
    user: null,
    login: (token, user) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        set({ token, user })
    },
    logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        set({ token: null, user: null })
        window.location.href = '/login'
    },
    hydrate: () => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')
        set({ token, user: userStr ? JSON.parse(userStr) : null })
    },
}))