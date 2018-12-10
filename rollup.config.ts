import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/fetch-to-tar.js', name: 'fetchToTar', format: 'umd', sourcemap: true },
    { file: 'dist/fetch-to-tar.mjs', format: 'esm', sourcemap: true },
  ],
  plugins: [
    typescript({ useTsconfigDeclarationDir: true }),
    sourceMaps(),
  ],
};
