import {readdirSync, readFileSync} from 'node:fs';

export const root = new URL('../', import.meta.url);
export const docs = new URL('docs/', root);
export const pkgVersion = () => JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).version;

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
export const isVersion = v => SEMVER.test(v);
export const cmpVersion = (a, b) => {
  const x = SEMVER.exec(a).slice(1).map(Number), y = SEMVER.exec(b).slice(1).map(Number);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};
// Built versions present in docs/, oldest first.
export const builtVersions = () => {
  try { return readdirSync(docs, {withFileTypes: true}).filter(d => d.isDirectory() && isVersion(d.name)).map(d => d.name).sort(cmpVersion); }
  catch { return []; }
};
