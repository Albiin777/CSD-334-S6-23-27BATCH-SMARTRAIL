import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      // Required for Firebase Google Sign-In popup to work correctly.
      // 'same-origin-allow-popups' allows the auth popup to postMessage back.
      // Do NOT add Cross-Origin-Embedder-Policy here — it blocks Firebase's relay page.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  }
})

