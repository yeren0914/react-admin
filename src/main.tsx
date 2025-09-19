import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import '@ant-design/v5-patch-for-react-19';
import { loadConfig } from './utils/env.ts'

async function bootstrap() {
  try {
    await loadConfig()
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (err) {
    console.error('Failed to bootstrap app', err)
  }
}

bootstrap()