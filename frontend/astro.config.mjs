import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://femcultura.ac.gov.br',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind(), sitemap()],
  trailingSlash: 'never',
});
