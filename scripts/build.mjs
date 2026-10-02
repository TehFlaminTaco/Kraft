// Build the current package.json version into docs/<version>/ and point docs/index.html at the latest version.
import {copyFileSync, existsSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import {root, docs, pkgVersion, isVersion, builtVersions} from './versions.mjs';

const version = pkgVersion();
if (!isVersion(version)) throw Error(`package.json version "${version}" is not plain MAJOR.MINOR.PATCH`);
if (existsSync(new URL(`${version}/`, docs))) console.warn(`note: docs/${version}/ exists and will be overwritten (bump the version to keep it)`);

await build({root: fileURLToPath(root), logLevel: 'warn'});

const versions = builtVersions(), latest = versions.at(-1);
const links = versions.slice().reverse().map(v => `<li><a href="./${v}/">${v}</a>${v == latest ? ' (latest)' : ''}</li>`).join('\n');
writeFileSync(new URL('index.html', docs), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kraft</title>
<link rel="icon" type="image/svg+xml" href="./favicon.svg">
<script>location.replace('./${latest}/'+location.hash)</script>
<noscript><meta http-equiv="refresh" content="0; url=./${latest}/"></noscript>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:600px;margin:auto;padding:16px;background:#fafaf7;color:#1d1d1b}a{color:#0b6b5c}
@media(prefers-color-scheme:dark){body{background:#161615;color:#ecebe5}a{color:#4cc3ad}}</style>
</head><body>
<p>Redirecting to <a href="./${latest}/">Kraft ${latest}</a>…</p>
<p>All versions:</p>
<ul>
${links}
</ul>
</body></html>
`);
writeFileSync(new URL('versions.json', docs), JSON.stringify({latest, versions}, null, 2) + '\n');
writeFileSync(new URL('.nojekyll', docs), '');
copyFileSync(new URL('src/ui/favicon.svg', root), new URL('favicon.svg', docs));
console.log(`built docs/${version}/index.html; docs/index.html -> ${latest} (${versions.length} version${versions.length == 1 ? '' : 's'})`);
