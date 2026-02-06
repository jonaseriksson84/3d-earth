// @ts-check

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: cloudflare(),

  build: {
    assets: '_astro',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
