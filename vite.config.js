import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/pages/index.html'),
        convert: resolve(__dirname, 'src/pages/convert.html'),
        directions: resolve(__dirname, 'src/pages/directions.html'),
        model: resolve(__dirname, 'src/pages/model.html'),
        order: resolve(__dirname, 'src/pages/order-disclosure.html'),
        search: resolve(__dirname, 'src/pages/search.html'),
        vault: resolve(__dirname, 'src/pages/vault.html')
      }
    }
  },
  server: {
    open: '/src/pages/index.html'
  }
});