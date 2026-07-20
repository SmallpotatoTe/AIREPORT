import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const next = require('next');
console.log(next ? 'next-loaded' : 'next-missing');
