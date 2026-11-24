import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Teste de fumaça das stories: renderiza todas em happy-dom. Separado do `npm run test` de propósito.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'happy-dom',
    include: ['src/stories/storySmoke.smoke.tsx'],
    testTimeout: 30000,
  },
})
