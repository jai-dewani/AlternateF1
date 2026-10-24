import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => ({
  plugins: mode !== 'test' ? [svelte()] : [],
  // base will be set when GitHub repo name is known, default '/' for now
  base: '/AlternateF1/',
  test: {
    environment: 'node',
  },
}));
