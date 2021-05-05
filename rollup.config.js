import fs from 'fs';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';

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
        { src: 'core/voxels.wasm', dest: 'dist' },
        { src: 'index.css', dest: 'dist' },
        { src: 'index.html', dest: 'dist' },
        { src: 'screenshot.png', dest: 'dist' },
        { src: 'sounds/*.ogg', dest: 'dist/sounds' },
      ],
    }),
    ...(production ? (
      [terser(), cname('dudes.gatunes.com')]
    ) : (
      [serve({ contentBase: path.join(__dirname, 'dist'), port: 8080 })])
    ),
  ],
};
