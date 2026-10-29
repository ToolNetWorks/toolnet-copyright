import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import sharp from 'sharp';

// Execute the real TypeScript functions with fake network, storage and database dependencies.
function loadTypeScript(relativePath, mocks = {}) {
  const filename = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = new Module(filename);
  mod.filename = filename;
  const require = createRequire(filename);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  mod._compile(compiled, filename);
  return mod.exports;
}

const fakeEnv = {
  TUMBLR_OAUTH_CONSUMER_KEY: 'test-consumer-key', TUMBLR_SECRET_KEY: 'test-consumer-secret',
  TUMBLR_TOKEN: 'test-token', TUMBLR_TOKEN_SECRET: 'test-token-secret',
  TUMBLR_BLOG: 'copyright-toolnet.tumblr.com', NEXT_PUBLIC_SITE_URL: 'https://toolnet.example',
};
const previousEnv = Object.fromEntries(Object.keys(fakeEnv).map(key => [key, process.env[key]]));
Object.assign(process.env, fakeEnv);
after(() => {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const declaration = loadTypeScript('src/lib/tumblr-declaration.ts');
const preview = await sharp({ create: { width: 32, height: 16, channels: 3, background: '#57935c' } }).png().toBuffer();
const asset = {
  id: '0d7919de-fbc5-4202-bd5d-deb6d0fd4d46', title: '<script>alert(1)</script>',
  owner_name: 'Owner & Author', owner_basis: 'original_creator', media_type: 'image',
  original_created_at: '1997-10-20T00:00:00+07:00', status: 'pending_verification',
  is_public: false, preview_key: 'previews/test.webp', sha256: null,
};
const client = loadTypeScript('src/lib/tumblr.ts', {
  '@/lib/tumblr-declaration': declaration,
  '@/lib/r2': {
    bucket: () => 'private-bucket',
    r2: () => ({ send: async command => {
      assert.equal(command.input.Key, asset.preview_key);
      return { Body: (async function* () { yield preview; })() };
    } }),
  },
});
const postId = '9007199254740993';
const creationResponse = () => Response.json({ meta: { status: 201 }, response: { id: Number(postId), id_string: postId } }, { status: 201 });

test('photo uses Legacy multipart with selected GMT date, complete declaration and exact ID', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'POST') return creationResponse();
    assert.equal(url, `https://api.tumblr.com/v2/blog/${fakeEnv.TUMBLR_BLOG}/posts?id=${postId}`);
    return Response.json({ response: { posts: [{ id_string: postId, date: '1997-10-19 17:00:00 GMT' }] } });
  });
  const result = await client.publishAssetToTumblr(asset);
  assert.equal(calls.length, 2);
  const { url, options } = calls[0];
  assert.equal(url, `https://api.tumblr.com/v2/blog/${fakeEnv.TUMBLR_BLOG}/post`);
  assert.match(options.headers.Authorization, /^OAuth /);
  assert.equal(options.headers['Content-Type'], undefined); // fetch supplies the multipart boundary.
  const form = options.body;
  assert.ok(form instanceof FormData);
  assert.equal(form.get('type'), 'photo');
  assert.equal(form.get('state'), 'published');
  assert.equal(form.get('date'), '1997-10-19 17:00:00 GMT');
  assert.equal(form.get('format'), 'html');
  assert.equal(form.get('link'), `https://toolnet.example/works/${asset.id}`);
  assert.equal(form.has('json'), false);
  const image = form.get('data');
  assert.equal(image.name, 'preview.jpg');
  assert.equal(image.type, 'image/jpeg');
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format, 'jpeg');
  const caption = form.get('caption');
  assert.doesNotMatch(caption, /<script>/);
  assert.match(caption, /&lt;script&gt;/);
  const text = caption.replaceAll('<br>', '\n').replaceAll('<p>', '').replaceAll('</p>', '');
  const sentAt = text.match(/Ngày gửi bài Tumblr thực tế: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/)[1];
  assert.ok(text.includes(declaration.buildTumblrDeclaration(asset.original_created_at, sentAt)));
  assert.match(text, /Đang chờ ToolNet Copyright xác minh SHA-256/);
  assert.equal(result.id, postId);
  assert.equal(result.url, `https://${fakeEnv.TUMBLR_BLOG}/post/${postId}`);
  assert.equal(result.requestedDisplayDate, asset.original_created_at);
  assert.equal(result.confirmedDisplayDate, '1997-10-19 17:00:00 GMT');
});

test('read-back failure preserves the created post ID and never sends a second POST', async t => {
  const methods = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    methods.push(options.method);
    if (options.method === 'POST') return creationResponse();
    throw new Error('Read-back timed out');
  });
  const result = await client.publishAssetToTumblr(asset);
  assert.deepEqual(methods, ['POST', 'GET']);
  assert.equal(result.id, postId);
  assert.equal(result.confirmedDisplayDate, null);
});

for (const [name, httpStatus, payload, retryable, detail] of [
  ['Legacy error array', 400, { meta: { status: 400, msg: 'Bad Request' }, response: { errors: ['Invalid date'] } }, false, /Invalid date/],
  ['NPF error details', 400, { meta: { status: 400 }, errors: [{ title: 'Invalid media', code: 8005, detail: 'Unsupported format' }] }, false, /Invalid media; code 8005; Unsupported format/],
  ['meta error despite HTTP 200', 200, { meta: { status: 400, msg: 'Invalid date' } }, false, /HTTP 200, meta.status 400/],
  ['HTTP server error despite meta 400', 503, { meta: { status: 400, msg: 'Unavailable' } }, true, /HTTP 503, meta.status 400/],
  ['error response containing a post ID', 400, { meta: { status: 400 }, response: { id_string: postId } }, true, /HTTP 400/],
]) {
  test(`Tumblr reports ${name} with safe retry classification`, async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(payload, { status: httpStatus }));
    await assert.rejects(client.publishAssetToTumblr(asset), error => {
      assert.ok(error instanceof client.TumblrApiError);
      assert.match(error.message, detail);
      assert.equal(error.retryable, retryable);
      return true;
    });
  });
}

test('Tumblr error details redact credentials before reaching the UI or Neon', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    meta: { status: 401, msg: 'Unauthorized' }, errors: Object.values(fakeEnv).slice(0, 4),
  }, { status: 401 }));
  await assert.rejects(client.publishAssetToTumblr(asset), error => {
    for (const value of Object.values(fakeEnv).slice(0, 4)) assert.equal(error.message.includes(value), false);
    assert.match(error.message, /\[redacted\]/);
    return true;
  });
});

test('missing or imprecise post IDs are uncertain and must not be retried automatically', async t => {
  for (const response of [{}, { id: Number(postId) }]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ response }, { status: 201 }));
    await assert.rejects(client.publishAssetToTumblr(asset), error => error instanceof client.TumblrApiError && error.retryable);
  }
});

test('video publishing keeps its NPF link request', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, `https://api.tumblr.com/v2/blog/${fakeEnv.TUMBLR_BLOG}/posts`);
    assert.equal(options.headers['Content-Type'], 'application/json');
    const body = JSON.parse(options.body);
    assert.equal(body.content.at(-1).type, 'link');
    assert.equal(body.date, undefined);
    return creationResponse();
  });
  const result = await client.publishAssetToTumblr({ ...asset, media_type: 'video', status: 'verified', is_public: true, sha256: 'abc123' });
  assert.equal(result.id, postId);
});

for (const status of ['failed', 'uncertain', 'published']) {
  test(`stored post ID prevents redispatch even when status is ${status}`, async () => {
    const queries = [];
    const route = loadTypeScript('src/app/api/assets/[id]/tumblr/route.ts', {
      '@/lib/auth': { isAdmin: async () => true, requireSameOrigin: async () => true },
      '@/lib/validation': { uuid: { safeParse: () => ({ success: true, data: asset.id }) } },
      '@/lib/db': { getAsset: async () => asset, database: () => async strings => {
        const sql = strings.join('?');
        queries.push(sql);
        if (sql.startsWith('INSERT')) return [];
        return [{ status, tumblr_post_id: postId, tumblr_url: null, blog: fakeEnv.TUMBLR_BLOG }];
      } },
      '@/lib/tumblr': { ...client, publishAssetToTumblr: async () => assert.fail('Must not publish again') },
    });
    const response = await route.POST(new Request('https://toolnet.example/api/assets/test/tumblr', {
      method: 'POST', body: JSON.stringify({ declarationConfirmed: true }),
    }), { params: Promise.resolve({ id: asset.id }) });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.alreadyPublished, true);
    assert.equal(body.id, postId);
    assert.equal(body.url, `https://${fakeEnv.TUMBLR_BLOG}/post/${postId}`);
    assert.match(queries[0], /status='failed' AND tumblr_publications.tumblr_post_id IS NULL/);
  });
}
