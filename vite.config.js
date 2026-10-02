import {readFileSync} from 'node:fs';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

const {version} = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const FAVICON = './src/ui/favicon.svg';

// Vite emits <link rel="icon"> targets as separate files; inline the favicon so each build stays one HTML file.
const inlineFavicon = {
  name: 'kraft-inline-favicon',
  apply: 'build',
  transformIndexHtml: {
    order: 'pre',
    handler: html => html.replace(`href="${FAVICON}"`, () =>
      `href="data:image/svg+xml,${encodeURIComponent(readFileSync(new URL(FAVICON, import.meta.url), 'utf8').replace(/\s*\n\s*/g, ''))}"`),
  },
};

// Every build is one self-contained HTML file in docs/<version>/ (GitHub Pages serves docs/ as the site root).
export default defineConfig({
  base: './',
  define: {__KRAFT_VERSION__: JSON.stringify(version)},
  plugins: [inlineFavicon, viteSingleFile()],
  optimizeDeps: {entries: ['index.html']},
  build: {outDir: `docs/${version}`, emptyOutDir: true, target: 'es2022'},
});
