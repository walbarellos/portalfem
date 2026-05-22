import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

export default defineConfig({
  site: 'http://localhost:4321',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind(), sitemap()],
  trailingSlash: 'never',
});
