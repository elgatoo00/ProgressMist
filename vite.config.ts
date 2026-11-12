import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Content-Security-Policy injectée uniquement dans le build de production
 * (le serveur de développement a besoin de scripts inline et de WebSocket).
 *
 * - script-src 'self'   : aucun script inline ni externe → un XSS ne peut pas exécuter de code injecté
 * - connect-src 'self'  : aucune requête réseau vers un autre site → pas d'exfiltration de données
 * - object-src 'none', base-uri 'self', form-action 'self' : ferment les vecteurs classiques
 * Le style inline est conservé (Recharts et les animations en ont besoin) ; les polices viennent de Google Fonts.
 */
function contentSecurityPolicy(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'progressmist-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
        { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
      ]
    },
  }
}

export default defineConfig({
  base: '/ProgressMist/',
  plugins: [react(), contentSecurityPolicy()],
  build: { sourcemap: false },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
