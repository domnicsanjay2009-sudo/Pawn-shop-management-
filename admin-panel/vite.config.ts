import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Support VITE_ prefix as well as non-VITE environment variables
  const adminEmail =
    env.VITE_ADMIN_EMAIL ||
    env.ADMIN_EMAIL ||
    env['ADMIN EMAIL'] ||
    process.env.VITE_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env['ADMIN EMAIL'] ||
    'domnicsanjay2009@gmail.com';

  const adminPassword =
    env.VITE_ADMIN_PASSWORD ||
    env.ADMIN_PASSWORD ||
    env['ADMIN PASSWORD'] ||
    process.env.VITE_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env['ADMIN PASSWORD'] ||
    'sanjay0920';

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'ADMIN_'],
    define: {
      'import.meta.env.VITE_ADMIN_EMAIL': JSON.stringify(adminEmail),
      'import.meta.env.VITE_ADMIN_PASSWORD': JSON.stringify(adminPassword),
      'import.meta.env.ADMIN_EMAIL': JSON.stringify(adminEmail),
      'import.meta.env.ADMIN_PASSWORD': JSON.stringify(adminPassword),
    },
    server: {
      port: 5174,
    },
  };
});
