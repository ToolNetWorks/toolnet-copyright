import { randomBytes, scryptSync } from 'node:crypto';

function readSecret(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error('Run this command in an interactive terminal to protect password input.'));
      return;
    }
    const original = process.stdin.isRaw;
    const chars = [];
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onInput = (data) => {
      for (const byte of data) {
        if (byte === 3) { cleanup(); reject(new Error('Cancelled')); return; }
        if (byte === 13 || byte === 10) {
          process.stdout.write('\n'); cleanup(); resolve(chars.join('')); return;
        }
        if (byte === 127 || byte === 8) { chars.pop(); continue; }
        if (byte < 32) continue;
        chars.push(String.fromCharCode(byte));
      }
    };
    function cleanup() {
      process.stdin.off('data', onInput);
      process.stdin.setRawMode(!!original);
      process.stdin.pause();
    }
    process.stdin.on('data', onInput);
  });
}

try {
  const password = await readSecret('Admin password (hidden; at least 12 characters): ');
  if (password.length < 12) throw new Error('Password must have at least 12 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to generate password hash');
  process.exitCode = 1;
}
