// vite.config.js or vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '748e-2401-4900-1c65-4ea9-9cf7-590c-9db8-1a1e.ngrok-free.app'  // ← Your ngrok host
    ]
  }
})
