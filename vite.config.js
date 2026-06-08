import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The ACC Forms API returns `Access-Control-Allow-Origin: *`, so the browser can
// call it directly. No dev proxy needed.
//
// `base: './'` makes asset URLs relative so the build works both at localhost root
// and under the GitHub Pages project sub-path (…/jtc-o3-poc/) without hardcoding it.
export default defineConfig({
  base: './',
  plugins: [react()],
})
