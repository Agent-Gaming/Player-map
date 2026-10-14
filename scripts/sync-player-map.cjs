// Copies dist/ into whatever test-player-map's node_modules/player-map
// symlink ACTUALLY resolves to — never guesses via an alphabetically-first
// glob match. That glob (`ls .pnpm/player-map@* | head -1`) silently picked
// the wrong pnpm store entry whenever two variants are installed side by
// side (e.g. the published "2.0.38" next to a "file:../../../Player-map"
// dev link): it always synced into the unused one, so build:sync appeared
// to run successfully while the app kept serving stale code.
const fs = require('node:fs');
const path = require('node:path');

const TEST_PLAYER_MAP_NODE_MODULES = path.resolve(
  __dirname,
  '../../playermap.box/examples/test-player-map/node_modules'
);

const linkPath = path.join(TEST_PLAYER_MAP_NODE_MODULES, 'player-map');
const target = fs.realpathSync(linkPath);
const targetDist = path.join(target, 'dist');

fs.rmSync(targetDist, { recursive: true, force: true });
fs.cpSync(path.resolve(__dirname, '../dist'), targetDist, { recursive: true });

fs.rmSync(path.join(TEST_PLAYER_MAP_NODE_MODULES, '.vite'), { recursive: true, force: true });

console.log(`Synced to ${target}`);
