import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/gems_site/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    open: true
  }
});