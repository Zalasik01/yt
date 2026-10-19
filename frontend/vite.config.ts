import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em dev o painel conversa com a API pelo mesmo host (sem CORS).
    proxy: { '/api': 'http://localhost:3333' },
  },
});
