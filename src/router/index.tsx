import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'


const Login = lazy(() => import('../pages/Login'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const NotFound = lazy(() => import('../pages/NotFound'))


function PrivateRoute({ children }: { children: JSX.Element }) {
    const { token } = useAuth()
    if (!token) return <Navigate to="/login" replace />
    return children
}


export const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/dashboard" replace /> },
    { path: '/login', element: <Login /> },
    {
        path: '/',
        element: (
            <PrivateRoute>
                <AppLayout />
            </PrivateRoute>
        ),
        children: [
            { path: '/dashboard', element: <Dashboard /> },
        ],
    },
    { path: '*', element: <NotFound /> },
])