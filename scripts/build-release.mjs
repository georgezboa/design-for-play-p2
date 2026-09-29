// Release build: same as `npm run build`, but with NIGHTFALL_RELEASE=1 so the
// playtest-only 1111 router and dev routes are compiled out.
import { spawnSync } from 'node:child_process';
const run = (args) => {
  const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
    stdio: 'inherit', env: { ...process.env, NIGHTFALL_RELEASE: '1' }, shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(['vite', 'build']);
