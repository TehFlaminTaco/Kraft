// Release a new version: run the suite, bump package.json (patch | minor | major | X.Y.Z), build into docs/<version>/.
// Usage: npm run release -- patch
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root, pkgVersion, builtVersions} from './versions.mjs';

const bump = process.argv[2] || 'patch';
const sh = cmd => execSync(cmd, {cwd: fileURLToPath(root), stdio: 'inherit'});
sh('node test/suite.mjs');
sh(`npm version ${bump} --no-git-tag-version`);
const version = pkgVersion();
if (builtVersions().includes(version)) throw Error(`docs/${version}/ already exists; refusing to overwrite a released version`);
sh('node scripts/build.mjs');
