import path from 'path';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import livereload from 'rollup-plugin-livereload';
import resolve from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import { watchExternal } from 'rollup-plugin-watch-external';

const outputPath = path.resolve(__dirname, 'dist');

export default {
  input: path.join(__dirname, 'examples', 'main.js'),
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
    alias({
      entries: [
        { find: 'dudes', replacement: __dirname },
      ]
    }),
    resolve({ browser: true }),
    commonjs(),
    copy({
      targets: [
        { src: 'node_modules/fflate/umd/index.js', dest: 'dist', rename: 'fflate.js' },
        { src: 'node_modules/three/examples/js/libs/ammo.wasm.*', dest: 'dist' },
        { src: 'screenshot.png', dest: 'dist' },
        { src: 'examples/sounds/*.ogg', dest: 'dist/sounds' },
        { src: 'vendor/fflate.worker.js', dest: 'dist' },
      ],
      copyOnce: true,
    }),
    copy({
      targets: [
        { src: 'core/voxels.wasm', dest: 'dist' },
        { src: 'examples/index.*', dest: 'dist' },
      ],
    }),
    ...(process.env.ROLLUP_WATCH ? [
      serve({
        contentBase: outputPath,
        historyApiFallback: true,
        port: 8080,
      }),
      livereload(outputPath),
      watchExternal({ entries: ['core/voxels.wasm', 'examples/index.css', 'examples/index.html'] }),
    ] : [
      terser(),
    ]),
  ],
  watch: { clearScreen: false },
};
