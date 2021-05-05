import fs from 'fs';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import { watchExternal } from 'rollup-plugin-watch-external';

const production = !process.env.ROLLUP_WATCH;

const cname = (domain) => ({
  writeBundle() {
    fs.writeFileSync(path.join(__dirname, 'dist', 'CNAME'), domain);
  },
});

export default {
  input: path.join(__dirname, 'main.js'),
  output: {
    format: 'es',
    file: path.join(__dirname, 'dist', 'main.js'),
  },
  plugins: [
    resolve({ browser: true }),
    copy({
      targets: [
        { src: 'node_modules/three/examples/js/libs/ammo.wasm.*', dest: 'dist' },
        { src: 'index.*', dest: 'dist' },
        { src: 'screenshot.png', dest: 'dist' },
        { src: 'sounds/*.ogg', dest: 'dist/sounds' },
        { src: 'core/voxels.wasm', dest: 'dist' },
      ],
    }),
    ...(production ? [
      cname('dudes.gatunes.com'),
      terser(),
    ] : [
      serve({ contentBase: path.join(__dirname, 'dist'), port: 8080 }),
      watchExternal({ entries: ['core/voxels.wasm'] }),
    ]),
  ],
  watch: { clearScreen: false },
};
