import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  optimizeDeps: { include: ['@mediapipe/tasks-vision'] },
  plugins: [
    react(),
    {
      name: 'camera-kit-local-origin',
      configureServer(server) {
        // Camera Kit's local testing accepts localhost; 127.0.0.1 is a separate origin.
        server.middlewares.use((request, response, next) => {
          const match = /^127\.0\.0\.1(:\d+)?$/.exec(request.headers.host ?? '');
          if (!match) return next();
          response.writeHead(307, {
            Location: `http://localhost${match[1] ?? ''}${request.url ?? '/'}`,
          });
          response.end();
        });
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    clearMocks: true,
  },
});
