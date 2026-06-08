import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The ACC Forms API returns `Access-Control-Allow-Origin: *`, so the browser can
// call it directly. No dev proxy needed.
export default defineConfig({
  plugins: [react()],
})
