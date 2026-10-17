import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const config = 'dist/server/wrangler.json';
if (!existsSync(config)) throw new Error('請先執行 npm run build，產生本機資料庫設定。');
const hosting = JSON.parse(readFileSync('.openai/hosting.json', 'utf8').replace(/^\uFEFF/, ''));
if (hosting.d1 !== 'DB') throw new Error('此初始化指令需要 .openai/hosting.json 的 d1 設為 DB。');
const sql = 'CREATE TABLE IF NOT EXISTS kitchens (owner text PRIMARY KEY NOT NULL, payload text NOT NULL, version integer NOT NULL);';
const result = spawnSync(process.execPath, [
  '--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js',
  'd1', 'execute', 'DB', '--local', '--config', config,
  '--persist-to', '.wrangler/state', '--command', sql,
], { stdio: 'inherit', env: { ...process.env, CLOUDFLARE_CF_FETCH_ENABLED: 'false', WRANGLER_SEND_METRICS: 'false' } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
