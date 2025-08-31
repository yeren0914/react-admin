import axios from 'axios'


const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    timeout: 15000,
})


// 请求拦截：自动携带 token
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})


// 响应拦截：统一错误处理
instance.interceptors.response.use(
    (res) => res.data,
    (error) => {
        const status = error?.response?.status
        if (status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    },
)


export default instance