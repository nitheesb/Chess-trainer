import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [react()]
    // Removed define process.env.API_KEY as it is no longer needed
  };
});