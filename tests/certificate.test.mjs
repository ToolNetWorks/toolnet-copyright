import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire, Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import QRCode from 'qrcode';

function load(relative,mocks={}) {
  const filename=fileURLToPath(new URL(`../${relative}`,import.meta.url));
  const code=ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mod=new Module(filename);mod.filename=filename;
  const require=createRequire(filename);
  mod.require=name=>Object.hasOwn(mocks,name)?mocks[name]:require(name);
  mod._compile(code,filename);
  return mod.exports;
}
const validation=load('src/lib/validation.ts');
const dates=load('src/lib/time-claims.ts');
const id='fe0a6fde-46c3-408b-912c-a8937b98c8a3';
const otherId='713986bc-86ac-4e67-b369-efbc143b80bf';
const hash='abc123'.repeat(10)+'abcd';
const asset={id,title:'A work <with special characters>',owner_name:'Declared Owner',owner_basis:'original_creator',media_type:'image',status:'pending_verification',is_public:false,original_created_at:'1997-10-20T05:00:00Z',created_at:'2026-10-29T12:00:00Z',verified_at:null,published_at:null,sha256:null,preview_key:`previews/${id}.webp`,staging_key:`staging/${id}/secret`,vault_key:`vault/${id}/secret`,description:'Private registration notes'};
const post={tumblr_post_id:'831811983669133312',tumblr_url:'https://copyright-toolnet.tumblr.com/post/831811983669133312',published_at:'2026-10-29T12:10:00Z'};
function model(current=asset,publication=post) {
  return load('src/lib/public-work.ts',{
    react:{cache:fn=>fn},'@/lib/validation':validation,
    '@/lib/db':{getAsset:async()=>current,database:()=>async strings=>{
      assert.match(strings.join('?'),/status='published'/);
      assert.match(strings.join('?'),/tumblr_post_id IS NOT NULL/);
      return publication?[publication]:[];
    }},
  });
}
const context={params:Promise.resolve({id})};

test('public visibility allows Tumblr-published pending images, without integrity verification',async()=>{
  const work=await model().getPublicWork(id);
  assert.equal(work.integrityVerified,false);
  assert.equal(work.published,false);
  assert.equal(work.previewKey,asset.preview_key);
});
test('private images without a successful Tumblr post remain hidden',async()=>{
  assert.equal(await model(asset,null).getPublicWork(id),null);
  assert.equal(await model(asset,{...post,tumblr_post_id:null}).getPublicWork(id),null);
  assert.equal(await model(asset,{...post,tumblr_url:'javascript:alert(1)'}).getPublicWork(id),null);
  assert.equal(await model(asset,{...post,tumblr_url:'https://attacker.example/post/1'}).getPublicWork(id),null);
});
test('private videos and unready or failed images stay hidden even with a Tumblr record',async()=>{
  for(const overrides of [{media_type:'video'},{status:'upload_pending'},{status:'verification_failed'}]) {
    assert.equal(await model({...asset,...overrides}).getPublicWork(id),null);
  }
});
test('public verified works remain visible without Tumblr, and use evidence for the verified badge',async()=>{
  const verified={...asset,status:'verified',is_public:true,sha256:hash,verified_at:'2026-10-29T12:20:00Z'};
  const work=await model(verified,null).getPublicWork(id);
  assert.equal(work.integrityVerified,true);
  assert.equal(work.published,true);
  for(const overrides of [{sha256:null},{sha256:'invalid'},{verified_at:null},{status:'pending_verification'}]) {
    assert.equal(model().hasVerifiedIntegrity({...verified,...overrides}),false);
  }
});
test('invalid and missing UUIDs fail closed before any public output',async()=>{
  assert.equal(await model().getPublicWork('invalid'),null);
  assert.equal(await model(null).getPublicWork(id),null);
});
test('preview allowlist never exposes staging, original, another asset, or traversal keys',()=>{
  const helper=model();
  for(const preview_key of [asset.staging_key,asset.vault_key,`previews/${otherId}.webp`,`previews/../vault/${id}`,`preview-staging/${id}/file`,`https://example.com/preview`]) {
    assert.equal(helper.publicPreviewKey({...asset,preview_key}),null);
  }
  assert.equal(helper.publicPreviewKey({...asset,vault_key:asset.preview_key}),null);
  const key=`video-previews/${id}/${hash}.mp4`;
  assert.equal(helper.publicPreviewKey({...asset,media_type:'video',preview_key:key}),key);
});
test('permanent URL uses the UUID and a fixed origin; Base64 is reversible display data',()=>{
  const url=model().permanentWorkUrl(id);
  assert.equal(new URL(url).pathname,`/works/${id}`);
  assert.throws(()=>model().permanentWorkUrl('invalid'));
  assert.equal(Buffer.from(Buffer.from(url).toString('base64'),'base64').toString(),url);
  assert.notEqual(model().permanentWorkUrl(otherId),url);
});

function pageFor(work) {
  let qrUrl;
  const page=load('src/app/works/[id]/page.tsx',{
    './certificate.css':{},
    '@/lib/public-work':{getPublicWork:async()=>work,permanentWorkUrl:model().permanentWorkUrl},
    '@/lib/time-claims':dates,
    '@/components/certificate-actions':({url})=>createElement('button',{'data-copy-url':url},'Sao chép liên kết'),
    'next/navigation':{notFound(){throw new Error('NOT_FOUND');}},
    'next/image':props=>{
      const imageProps={...props};
      delete imageProps.unoptimized;
      return createElement('img',imageProps);
    },
    'next/link':props=>createElement('a',props),
    qrcode:{toDataURL:async(url,options)=>{qrUrl=url;return QRCode.toDataURL(url,options);}},
  });
  return {page,qrUrl:()=>qrUrl};
}
test('pending certificate never displays VERIFIED or a hash and omits private registration notes',async()=>{
  const record=await model().getPublicWork(id);
  const {page,qrUrl}=pageFor(record);
  const html=renderToStaticMarkup(await page.default(context));
  assert.doesNotMatch(html,/data-integrity="verified"/);
  assert.match(html,/data-integrity="pending"/);
  assert.doesNotMatch(html,/class="certificate-hash"/);
  assert.doesNotMatch(html,/Private registration notes|staging\/.+secret|vault\/.+secret/);
  assert.match(html,/\/api\/works\/fe0a6fde-46c3-408b-912c-a8937b98c8a3\/preview/);
  assert.match(html,/Ownership Declaration/);
  assert.doesNotMatch(html,/License information|Logo và chữ ký|Chưa được cung cấp trong hồ sơ/);
  assert.equal((html.match(/class="certificate-status"/g)??[]).length,1);
  assert.equal((html.match(/Declared Owner/g)??[]).length,1);
  assert.match(html, /Work Information/);
  assert.match(html, /File Integrity &amp; Technical Evidence/);
  assert.doesNotMatch(html, /DigiCert|SHA3-256|SHA-512|PDQ Hash|RFC 3161|Ed25519|C2PA|Active Protection|All Rights Reserved|\/verify\//);
  assert.ok(html.indexOf('class="certificate-status"')<html.indexOf('id="work-info-heading"'));
  assert.ok(html.indexOf('class="certificate-preview"')<html.indexOf('class="certificate-evidence"'));
  assert.ok(html.indexOf('class="certificate-evidence"')<html.indexOf('class="certificate-declaration"'));
  assert.match(html, /Original Creation Date/);
  assert.match(html, /Ngày sáng tạo gốc \(chủ sở hữu khai báo\)/);
  const permanent=model().permanentWorkUrl(id);
  assert.equal(qrUrl(),permanent);
  assert.match(html,/data:image\/png;base64,/);
  const encoded=html.match(/data-permanent-url-base64="([^"]+)"/)[1];
  assert.equal(Buffer.from(encoded,'base64').toString('utf8'),permanent);
  assert.match(html,/không phải chữ ký số hoặc bằng chứng xác thực độc lập/);
  assert.deepEqual((await page.generateMetadata(context)).robots,{index:false,follow:false});
});
test('verified certificate displays the exact hash and distinguishes publication status',async()=>{
  for(const is_public of [false,true]) {
    const record=await model({...asset,status:'verified',is_public,sha256:hash,verified_at:'2026-10-29T12:20:00Z'}).getPublicWork(id);
    const {page}=pageFor(record);
    const html=renderToStaticMarkup(await page.default(context));
    assert.match(html,/data-integrity="verified"/);
    assert.equal((html.match(/class="certificate-status"/g)??[]).length,1);
    assert.ok(html.includes(hash));
    assert.equal(html.includes('Private registration notes'),is_public);
    assert.deepEqual((await page.generateMetadata(context)).robots,{index:is_public,follow:is_public});
  }
});
test('missing certificate returns not-found with non-indexable metadata',async()=>{
  const {page}=pageFor(null);
  await assert.rejects(page.default(context),/NOT_FOUND/);
  assert.equal((await page.generateMetadata(context)).robots.index,false);
});

function previewRoute(work,send) {
  return load('src/app/api/works/[id]/preview/route.ts',{
    '@/lib/public-work':{getPublicWork:async()=>work},
    '@/lib/r2':{bucket:()=> 'private-preview-bucket',r2:()=>({send})},
  });
}
test('public preview denies access before touching R2 when work is hidden or preview absent',async()=>{
  for(const work of [null,{previewKey:null}]) {
    const route=previewRoute(work,()=>assert.fail('R2 must not be called'));
    assert.equal((await route.GET(new Request('https://example.com/preview'),context)).status,404);
  }
});
test('preview streams only the approved derivative, with no signed redirect or source key',async()=>{
  const work=await model().getPublicWork(id);
  const route=previewRoute(work,async command=>{
    assert.equal(command.input.Key,asset.preview_key);
    return {Body:{transformToWebStream:()=>new Blob(['preview']).stream()},ContentLength:7};
  });
  const response=await route.GET(new Request('https://example.com/preview'),context);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Content-Type'),'image/webp');
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  assert.equal(response.headers.get('Location'),null);
  assert.equal(await response.text(),'preview');
});
test('video preview range requests stream partial bytes and malformed ranges are rejected',async()=>{
  const work={asset:{media_type:'video'},previewKey:`video-previews/${id}/${hash}.mp4`};
  const route=previewRoute(work,async command=>{
    assert.equal(command.input.Range,'bytes=0-6');
    return {Body:{transformToWebStream:()=>new Blob(['preview']).stream()},ContentLength:7,ContentRange:'bytes 0-6/20'};
  });
  const response=await route.GET(new Request('https://example.com/preview',{headers:{Range:'bytes=0-6'}}),context);
  assert.equal(response.status,206);
  assert.equal(response.headers.get('Content-Range'),'bytes 0-6/20');
  assert.equal(response.headers.get('Content-Type'),'video/mp4');
  assert.equal((await route.GET(new Request('https://example.com/preview',{headers:{Range:'bytes=0-1,3-4'}}),context)).status,416);
});
