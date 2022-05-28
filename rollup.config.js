// import de nos plugins
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import { uglify } from "rollup-plugin-uglify";

export default {
    input: './src/ConeFrustum.js',
    output: {
        file: './dist/browser/three-js-cone-frustum.js',
        format: 'cjs'
    },
    external: ['@dualbox/three', 'three'],
    plugins: [
        commonjs(), // prise en charge de require
        resolve(), // prise en charge des modules depuis node_modules
    ]
};
