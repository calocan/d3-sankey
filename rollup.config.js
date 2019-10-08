import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import {terser} from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import * as R from 'ramda';

const config = {
  input: [
    'src/index.js',
    'src/align.js',
    'src/constant.js',
    'src/sankey.js',
    'src/sankeyHelpers.js',
    'src/sankeyLinkHorizontal.js'
  ],
  plugins: []
};
const externals = [ '@turf/rhumb-bearing', '@turf/rhumb-distance', '@turf/bbox-polygon', '@turf/bbox', 'prop-types', 'symbol-observable', 'folktale/concurrency/task', 'folktale/result', 'folktale/maybe', 'ramda-fantasy-validation'];

const configs = R.map(c => {
  const x = R.merge(config, c);
  //console.warn(x);
  return x;
}, [
  // CommonJS
  {
    output: {
      dir: 'lib',
      format: 'cjs',
      indent: true,
      sourcemap: true
    },
    external: [
      ...externals,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: R.concat(config.plugins, [
      commonjs({
        'node_modules/folktale/result/index.js': ['Result', 'Error', 'Ok'],
        'node_modules/folktale/maybe/index.js': ['Just'],
        'node_modules/folktale/concurrency/task/index.js': ['task', 'rejected', 'of']
      }),
      babel()
    ])
  },
  // ES
  {
    output: {
      dir: 'esm',
      format: 'esm',
      indent: true,
      sourcemap: false,
    },
    external: [
      ...externals,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: R.concat(config.plugins, [])
  },

  // ES for Browsers
  /*
  {
    output: {
      dir: 'esm',
      chunkFileNames: "[name]-[hash].mjs",
      entryFileNames: "[name].mjs",
      format: 'esm',
      indent: true,
      sourcemap: true
    },
    external: [
      ...externals,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: R.concat(config.plugins, [
      nodeResolve({}),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ])
  }
   */
]);
export default configs;