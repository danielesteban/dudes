import fs from 'fs';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import livereload from 'rollup-plugin-livereload';
import resolve from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import { watchExternal } from 'rollup-plugin-watch-external';

const outputPath = path.resolve(__dirname, 'dist');

const cname = (domain) => ({
  writeBundle() {
    fs.writeFileSync(path.join(outputPath, 'CNAME'), domain);
  },
});

export default {
  input: path.join(__dirname, 'main.js'),
  output: {
    file: path.join(outputPath, 'main.js'),
    format: 'module',
  },
  onwarn: (warning, next) => {
    if (!(warning.importer || warning.id).includes('protobufjs')) {
      next(warning);
    }
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    copy({
      targets: [
        { src: 'node_modules/fflate/umd/index.js', dest: 'dist', rename: 'fflate.js' },
        { src: 'node_modules/three/examples/js/libs/ammo.wasm.*', dest: 'dist' },
        { src: 'screenshot.png', dest: 'dist' },
        { src: 'sounds/*.ogg', dest: 'dist/sounds' },
        { src: 'vendor/fflate.worker.js', dest: 'dist' },
      ],
      copyOnce: true,
    }),
    copy({
      targets: [
        { src: 'core/voxels.wasm', dest: 'dist' },
        { src: 'index.*', dest: 'dist' },
      ],
    }),
    ...(process.env.ROLLUP_WATCH ? [
      serve({
        contentBase: outputPath,
        historyApiFallback: true,
        port: 8080,
      }),
      livereload(outputPath),
      watchExternal({ entries: ['index.css', 'index.html', 'core/voxels.wasm'] }),
    ] : [
      cname('dudes.gatunes.com'),
      terser(),
    ]),
  ],
  watch: { clearScreen: false },
};
