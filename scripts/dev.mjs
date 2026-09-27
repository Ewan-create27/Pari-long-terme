import {spawn,spawnSync} from 'node:child_process';
spawnSync(process.execPath,['scripts/build-server.mjs'],{stdio:'inherit'});
const api=spawn(process.execPath,['--env-file-if-exists=.env','dist-server/server/index.js'],{stdio:'inherit',env:{...process.env,PORT:'3001',APP_URL:'http://localhost:5173',NODE_ENV:'development'}});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'});
function stop(){api.kill();web.kill();}process.on('SIGINT',stop);process.on('SIGTERM',stop);
