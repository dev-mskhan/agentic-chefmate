import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const gatewayUrl = process.env.VITE_API_GATEWAY_URL || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/v1': {
        target: gatewayUrl,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: gatewayUrl,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
