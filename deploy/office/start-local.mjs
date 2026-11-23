import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const candidates = ['docker', path.join(homedir(), '.local/bin/docker'), '/Applications/Docker.app/Contents/Resources/bin/docker'];
const contexts = process.env.OFFICE_DOCKER_CONTEXT ? [process.env.OFFICE_DOCKER_CONTEXT] : ['', 'lima-sdg-office'];
let docker, contextArgs;
for (const candidate of candidates) {
  for (const context of contexts) {
    const args = context ? ['--context', context] : [];
    if (spawnSync(candidate, [...args, 'version'], { stdio: 'ignore', timeout: 15000 }).status === 0) {
      docker = candidate; contextArgs = args; break;
    }
  }
  if (docker) break;
}
if (!docker) {
  console.error('Docker chưa chạy. Trên Mac dùng Docker Desktop hoặc khởi động Lima: ~/.local/bin/limactl start sdg-office. Trên VPS Linux dùng Docker Engine + Compose. Chưa thay đổi cấu hình ERP.'); process.exit(1);
}
if (spawnSync(docker, [...contextArgs, 'compose', 'version'], { stdio: 'ignore' }).status !== 0) throw Error('Cần cài Docker Compose plugin.');
const activeContext = contextArgs[1] || spawnSync(docker, ['context', 'show'], { encoding: 'utf8' }).stdout?.trim();
const appHost = activeContext === 'lima-sdg-office' ? 'host.lima.internal' : 'host.docker.internal';
const file = path.join(root, '.env.office');
let env;
try { env = await readFile(file, 'utf8'); }
catch { env = `OFFICE_PUBLIC_URL=http://localhost:8088\nOFFICE_INTERNAL_URL=http://localhost:8088\nOFFICE_APP_URL=http://${appHost}:4000\nOFFICE_JWT_SECRET=${randomBytes(48).toString('hex')}\nOFFICE_MOBILE_EDIT_ENABLED=false\n`; await writeFile(file, env, { mode: 0o600, flag: 'wx' }); }
if (!/^OFFICE_JWT_SECRET=.{32,}$/m.test(env)) throw Error('Khóa Office trong .env.office chưa hợp lệ.');
const local = path.join(root, '.env.local'); let current = ''; try { current = await readFile(local, 'utf8'); } catch { /* initial file */ }
if (/^OFFICE_/m.test(current)) {
  const readSecret = value => value.match(/^OFFICE_JWT_SECRET=(.*)$/m)?.[1]?.trim();
  if (readSecret(current) !== readSecret(env)) throw Error('Khóa Office trong .env.local và .env.office khác nhau. Giữ nguyên cấu hình; cần đối chiếu trước khi khởi chạy.');
  console.log('Đã có cấu hình Office trong .env.local; giữ nguyên.');
} else await writeFile(local, `${current}\n# Local Office editor\n${env}`, { mode: 0o600 });
await chmod(file, 0o600);
await chmod(local, 0o600);
console.log(`Docker context: ${activeContext}`);
const composeArgs = [...contextArgs, 'compose', '--env-file', file, '-f', path.join(root, 'deploy/office/compose.yaml')];
const command = spawnSync(docker, [...composeArgs, 'up', '-d'], { cwd: root, stdio: 'inherit' });
if (command.status !== 0) process.exit(command.status || 1);
console.log('Đang chờ Office chuẩn bị font/cache. Có thể mất vài phút.');
const deadline = Date.now() + 10 * 60 * 1000;
while (Date.now() < deadline) {
  const fonts = spawnSync(docker, [...composeArgs, 'exec', '-T', 'office', 'pgrep', '-f', '[d]ocumentserver-generate-allfonts'], { stdio: 'ignore', timeout: 15000 });
  const health = spawnSync(docker, [...composeArgs, 'exec', '-T', 'office', 'curl', '--fail', '--silent', '--max-time', '5', 'http://127.0.0.1/healthcheck'], { encoding: 'utf8', timeout: 15000 });
  if (fonts.status === 1 && health.status === 0 && health.stdout.trim() === 'true') {
    console.log('Office đã sẵn sàng tại http://localhost:8088. Tải lại trang ERP; khởi động lại dev server nếu chưa nhận cấu hình mới.');
    process.exit(0);
  }
  await delay(5000);
}
console.error('Office chưa sẵn sàng sau 10 phút. Container được giữ lại; kiểm tra log dịch vụ và chạy lại script sau khi xử lý.');
process.exit(1);
