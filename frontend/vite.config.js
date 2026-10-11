import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Material UI makes a ~630 kB bundle; fine for this app, so no split warning.
  build: { chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    strictPort: true, // CORS on both APIs allows exactly this origin
  },
});
// NOTE : I can convert to cors as well based on the requirements
//port : Number(process.env.PORT) || 5173,