import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import apiHandler from './api/index.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-serverless-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
            try {
              await apiHandler(req, res);
            } catch (err) {
              next(err);
            }
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    host: true
  }
});
