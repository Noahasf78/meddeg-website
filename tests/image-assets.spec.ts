import { test, expect } from '@playwright/test';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { images } from '../src/content/images';

for (const src of new Set(Object.values(images).map(image => image.src))) {
  test(`registered image exists with exact casing and is served: ${src}`, async ({ request }) => {
    expect(src).toMatch(/^\/images\//);
    const segments = decodeURIComponent(src).slice(1).split('/');
    let directory = path.resolve('public');
    for (const segment of segments) {
      expect(segment).not.toBe('..');
      expect(await readdir(directory), `Exact filename casing for ${src}`).toContain(segment);
      directory = path.join(directory, segment);
    }
    expect((await stat(directory)).isFile()).toBe(true);

    const response = await request.get(src);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\//);
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  });
}
