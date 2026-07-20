import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['app/**/*', 'components/**/*', 'lib/**/*', 'types/**/*'],
  format: ['esm'],
  dts: false,
  clean: false,
});
