import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA/Service Worker disabled: VPNs (e.g. Astrill) often break SW registration
// and cached fetches, causing the site to fail. Run without SW so it works with VPN on.
// base: './' = relative URLs so assets load correctly through proxies/VPNs (Astrill, etc.)
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()]
})
