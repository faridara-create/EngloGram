import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sites } from '@openai/sites-vite-plugin'

export default defineConfig(({ command, mode }) => ({
  // GitHub Pages keeps its subpath; Sites and local development use the origin root.
  base: command === 'build' && mode !== 'sites' ? '/EngloGram/' : '/',
  plugins: [react(), sites()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}))
