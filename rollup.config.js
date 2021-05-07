import fs from 'fs';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
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
    ...(process.env.ROLLUP_WATCH ? [
      serve({
        contentBase: outputPath,
        historyApiFallback: true,
        port: 8080,
      }),
      watchExternal({ entries: ['core/voxels.wasm'] }),
    ] : [
      cname('dudes.gatunes.com'),
      terser(),
    ]),
  ],
  watch: { clearScreen: false },
};
