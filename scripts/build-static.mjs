import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve('.');
const dist = join(root, 'dist');
const excluded = new Set(['.git', '.github', '.vercel', 'node_modules', 'dist', 'scripts', 'tools', 'package.json', 'package-lock.json', 'vercel.json', 'README.md']);
const photographs = [
  'images/lifestyle/hero.jpg',
  'images/lifestyle/higuera.jpg',
  'images/lifestyle/noche.jpg',
  'images/apartamentos/perla/perla-hero-vistas.jpg',
  'images/apartamentos/perla/perla-1-nueva.jpg',
  'images/apartamentos/perla/cocina-perla.jpg',
  'images/apartamentos/perla/habitacion-perla-2.jpg',
  'images/apartamentos/perla/piscina-perla.jpg'
];

await mkdir(dist, { recursive: true });
for (const entry of await readdir(root)) {
  if (!excluded.has(entry)) await cp(join(root, entry), join(dist, entry), { recursive: true });
}

let originalBytes = 0;
let resultBytes = 0;
for (const filename of photographs) {
  const path = join(dist, filename);
  const source = await readFile(path);
  const before = await sharp(source).metadata();
  if (before.format !== 'png' || before.hasAlpha) {
    throw new Error('Unexpected source format/transparency: ' + filename);
  }
  const optimized = await sharp(source).jpeg({
    quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true, progressive: true
  }).toBuffer();
  const after = await sharp(optimized).metadata();
  if (after.format !== 'jpeg' || after.width !== before.width ||
      after.height !== before.height || optimized.length >= source.length) {
    throw new Error('Output verification failed: ' + filename);
  }
  await writeFile(path, optimized);
  originalBytes += source.length;
  resultBytes += optimized.length;
  console.log(filename + ': ' + source.length + ' -> ' + optimized.length + ' bytes');
}
console.log('Saved ' + ((originalBytes - resultBytes) / 1048576).toFixed(2) + ' MiB in static output; Git originals preserved.');
