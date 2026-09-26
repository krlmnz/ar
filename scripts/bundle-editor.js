/* Bundle the studio editor for the browser. Eleventy copies the result. */
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['assets/js/studio/index.js'],
  bundle: true,
  format: 'iife',
  outfile: 'assets/js/editor.bundle.js',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
