'use strict';
// Dedicated campaign worker. It never creates or impersonates an admin session.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const run = promisify(require('node:child_process').execFile);
const BASE = 'https://www.synergiedour.be/api/holiday/agent';
const PAGE = '1109324298929601';
const ROOT = '/work';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(url, { method = 'POST', body = {}, lease, binary = false, raw = false, contentType = "video/mp4" } = {}) {
  const r = await fetch(BASE + url, { method, headers: {
    Authorization: `Bearer ${process.env.HOLIDAY_AGENT_TOKEN}`,
    ...(lease ? { 'X-Holiday-Lease': lease } : {}),
    ...(method === 'GET' ? {} : { 'Content-Type': binary ? contentType : 'application/json' }),
  }, ...(method === 'GET' ? {} : { body: binary ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(180000) });
  if (!r.ok) throw Error(`CAMPAIGN_HTTP_${r.status}`);
  return raw ? Buffer.from(await r.arrayBuffer()) : r.json();
}
function copy(fields) {
  const clean = v => String(v ?? '').replace(/[\x00-\x1f]/g, ' ').trim();
  const name = clean(fields.businessName), activity = clean(fields.activity);
  // Source fields are data, never prompts or shell instructions. No invented
  // discounts, testimonials, opening hours or events are added.
  const voiceover = `Pour les fêtes de fin d’année, Synergie Dour met ses commerçants à l’honneur. Découvrez ${name}. Son activité : ${activity}. Photos, idées cadeaux, menus ou offres de fêtes : retrouvez les informations transmises par ce commerce dans notre publication. Pour vos achats de fin d’année, pensez au commerce local. Suivez Synergie Dour et découvrez nos adhérents sur synergie dour point be.`;
  if (voiceover.split(/\s+/).length > 115) throw Error('VOICE_TOO_LONG');
  const details = [fields.offer, fields.hours && `Horaires : ${fields.hours}`, fields.orderDeadline && `Date limite : ${fields.orderDeadline}`, fields.fulfillment && `Commandes et livraison : ${fields.fulfillment}`, fields.address && `Adresse : ${fields.address}`].filter(Boolean).map(clean).join('\n\n');
  if (details.length > 4200) throw Error('COPY_REQUIRES_EDIT');
  const caption = `🎄 ${name} — Fêtes 2026 avec Synergie Dour\n\n${activity}\n\n${details}\n\nSoutenons le commerce local ! Partagez cette publication et découvrez les commerçants adhérents sur synergiedour.be.\n\n#SynergieDour #CommerceLocal #Fêtes2026`;
  if (caption.length > 5000) throw Error("COPY_REQUIRES_EDIT");
  return { voiceover, facebook: caption, instagram: caption.length <= 2200 ? caption : `${name} — Fêtes 2026 avec Synergie Dour\n\n${activity}\n\nRetrouvez les informations du commerce dans la publication Facebook de Synergie Dour.\n\n#SynergieDour #CommerceLocal #Fêtes2026`, decorations: 'noel-2026', subtitles: true };
}
async function render(job) {
  const directory = path.join(ROOT, String(job.id));
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    const result = copy(job.fields);
    const files = [];
    const seen = new Set();
    for (const file of job.files.filter(f => !seen.has(f.sha256) && seen.add(f.sha256)).slice(0, 8)) {
      const data = await api(`/jobs/${job.id}/files/${file.id}`, { method: 'GET', lease: job.lease, raw: true });
      if (data.length > 50 * 1024 * 1024 || sha(data) !== file.sha256) throw Error('SOURCE_HASH');
      const filename = path.join(directory, file.id);
      await fs.writeFile(filename, data, { mode: 0o600 });
      files.push({ path: filename, mime: file.mime });
    }
    // Validate source coverage BEFORE incurring any voice-generation cost.
    if (files.filter(f => f.mime.startsWith('image/')).length < 4 && !files.some(f => f.mime.startsWith('video/'))) throw Error('MORE_REAL_MEDIA_REQUIRED');
    await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ ...job.fields, files, voiceover: result.voiceover }));
    await run('python3', ['/opt/holiday/render.py', directory, '--check'], { timeout: 120000, maxBuffer: 16384 });
    const { synthesizeVoice } = require('/app/server-synergie-video-factory.cjs');
    const core = require('/app/server-synergie-video-core.cjs');
    const profile = core.voiceProfileFor('synergie-dour');
    const voice = await synthesizeVoice({ payload: core.ttsPayload(result.voiceover, profile), profile, apiKey: process.env.WAVESPEED_API_KEY });
    await fs.writeFile(path.join(directory, 'voice.wav'), voice.buffer, { mode: 0o600 });
    await fs.writeFile(path.join(directory, 'text.txt'), result.voiceover);
    await run('python3', ['/app/tools/synergie-video/align_voice.py', path.join(directory, 'voice.wav'), path.join(directory, 'text.txt'), path.join(directory, 'align.json')], { timeout: 120000, maxBuffer: 16384 });
    await run('python3', ['/opt/holiday/render.py', directory], { timeout: 20 * 60000, maxBuffer: 32768 });
    const qa = JSON.parse(await fs.readFile(path.join(directory, 'qa.json'), 'utf8'));
    const video = await fs.readFile(path.join(directory, 'video.mp4'));
    const receipt = await api(`/jobs/${job.id}/video`, { lease: job.lease, binary: true, body: video });
    if (receipt.sha256 !== sha(video)) throw Error('RESULT_HASH');
    await api(`/jobs/${job.id}/proof`, {lease:job.lease,binary:true,contentType:"image/jpeg",body:await fs.readFile(path.join(directory,"contact-sheet.jpg"))});
    await api(`/jobs/${job.id}/complete`, { lease: job.lease, body: { sha256: receipt.sha256, result, qa } });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function publish(job) {
  if (job.targets?.length !== 1 || job.targets[0].network !== 'facebook' || job.targets[0].id !== PAGE) throw Error('TARGET_REFUSED');
  const video = await api(`/jobs/${job.id}/video`, { method: 'GET', lease: job.lease, raw: true });
  if (sha(video) !== job.sha256) throw Error('PUBLISH_HASH');
  await api(`/jobs/${job.id}/check`, { lease: job.lease, body: { attempt: job.attempt } });
  if (!process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN) throw Error('PAGE_DISCONNECTED');
  const form = new FormData();
  form.append('access_token', process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN);
  form.append('description', job.caption);
  form.append('source', new Blob([video], { type: 'video/mp4' }), 'synergie-fetes-2026.mp4');
  const version = process.env.META_GRAPH_VERSION || 'v23.0';
  const r = await fetch(`https://graph-video.facebook.com/${version}/${PAGE}/videos`, { method: 'POST', body: form, signal: AbortSignal.timeout(240000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !/^\d+(?:_\d+)?$/.test(String(data.id || data.post_id || ''))) throw Error('META_RESULT_UNCERTAIN');
  const id = String(data.id || data.post_id);
  // Preserve the external id BEFORE the verification request so an interrupted
  // request can be reconciled without posting again.
  const pending = { job: { id: job.id, lease: job.lease }, receipt: { attempt: job.attempt, id, url: `https://www.facebook.com/${id}` } };
  await fs.writeFile(path.join(ROOT, `receipt-${job.id}.json`), JSON.stringify(pending), { mode: 0o600 });
  await reconcile(pending);
}
async function reconcile(pending) {
  const { job, receipt } = pending;
  const version = process.env.META_GRAPH_VERSION || 'v23.0';
  const u = new URL(`https://graph.facebook.com/${version}/${receipt.id}`);
  u.search = new URLSearchParams({ fields: 'id,permalink_url', access_token: process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN });
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  const d = await r.json(); if (!r.ok || String(d.id) !== receipt.id) throw Error('META_VERIFICATION_PENDING');
  if (d.permalink_url) {
    const url = new URL(d.permalink_url);
    if (url.protocol !== 'https:' || !['facebook.com', 'www.facebook.com'].includes(url.hostname)) throw Error('META_LINK_REFUSED');
    receipt.url = url.href;
  }
  const result = await api(`/jobs/${job.id}/published`, { lease: job.lease, body: receipt });
  if (!['accepted', 'disabled', 'discarded'].includes(result.notification)) return; // Retry the receipt/email, never the publication.
  await fs.unlink(path.join(ROOT, `receipt-${job.id}.json`));
}
async function cycle() {
  await fs.mkdir(ROOT, { recursive: true, mode: 0o700 });
  if (Date.now() >= Date.parse('2027-03-31T00:00:00+02:00')) {
    for (const name of await fs.readdir(ROOT)) if (/^receipt-\d+\.json$/.test(name)) await fs.unlink(path.join(ROOT,name));
    return;
  }
  for (const entry of await fs.readdir(ROOT)) {
    if (/^receipt-\d+\.json$/.test(entry)) {
      try { await reconcile(JSON.parse(await fs.readFile(path.join(ROOT, entry), 'utf8'))); }
      catch { console.error('HOLIDAY_RECEIPT_REQUIRES_RECONCILIATION'); }
    }
  }
  for (const phase of ['publish', 'render']) {
    const { job } = await api('/claim', { body: { phase } });
    if (!job) continue;
    try { await (phase === 'render' ? render : publish)(job); console.log(`HOLIDAY_${phase.toUpperCase()}_FINISHED job=${job.id}`); }
    catch {
      // Never log provider responses, source personal data, raw leases or tokens.
      console.error(`HOLIDAY_${phase.toUpperCase()}_REQUIRES_REVIEW job=${job.id}`);
      await api(`/jobs/${job.id}/failure`, { lease: job.lease, body: { code: phase === 'render' ? 'render_failed' : 'publish_uncertain' } }).catch(() => {});
    }
  }
}
if (require.main === module) (async () => {
  await fs.mkdir(ROOT, {recursive:true,mode:0o700});
  for (const e of await fs.readdir(ROOT,{withFileTypes:true})) if(e.isDirectory() && /^\d+$/.test(e.name)) await fs.rm(path.join(ROOT,e.name),{recursive:true,force:true});
  setInterval(() => api('/heartbeat').catch(() => {}), 30000).unref();
  for (;;) { try { await cycle(); } catch { console.error('HOLIDAY_AGENT_UNAVAILABLE'); } await sleep(30000); }
})();
module.exports = { copy, sha, PAGE, publish, reconcile };
