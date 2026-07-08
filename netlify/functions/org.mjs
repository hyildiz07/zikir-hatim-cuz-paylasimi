// ELİFA Birlikte — Netlify Blobs backend
// POST /api/org { action, ... }
import { getStore } from '@netlify/blobs';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);

const randCode = (length) => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

function publicView(org, isAdmin = false) {
  const view = {
    code: org.code,
    type: org.type,
    title: org.title,
    adminName: org.adminName,
    dueDate: org.dueDate,
    createdAt: org.createdAt,
    items: org.items || [],
    isAdmin: Boolean(isAdmin)
  };

  if (org.type === 'zikir') {
    const contributions = org.contributions || [];
    view.zikirAd = org.zikirAd;
    view.hedef = org.hedef;
    view.toplam = contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    view.katilanlar = [...new Set(contributions.map((item) => item.name).filter(Boolean))];
    if (isAdmin) view.contributions = contributions;
  }

  return view;
}

async function readOrg(store, code) {
  if (!code) return null;
  return await store.get(`org:${code}`, { type: 'json' });
}

async function saveOrg(store, org) {
  await store.setJSON(`org:${org.code}`, org);
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Sadece POST desteklenir.' }, 405);

  let p;
  try {
    p = await req.json();
  } catch {
    return json({ error: 'Geçersiz JSON isteği.' }, 400);
  }

  const store = getStore('elifa-birlikte');

  try {
    if (p.action === 'create') {
      const input = p.org || {};
      const type = clean(input.type, 20);
      const title = clean(input.title, 120);
      if (!['hatim', 'zikir'].includes(type)) return json({ error: 'Geçersiz organizasyon türü.' }, 400);
      if (!title) return json({ error: 'Başlık/niyet gerekli.' }, 400);

      const code = randCode(6);
      const adminToken = randCode(14);
      const org = {
        code,
        adminToken,
        type,
        title,
        adminName: clean(input.adminName, 60),
        dueDate: clean(input.dueDate, 10) || null,
        createdAt: Date.now(),
        items: [],
        contributions: []
      };

      if (type === 'hatim') {
        const items = Array.isArray(input.items) ? input.items : [];
        const count = Math.min(Math.max(items.length || Number(input.count) || 30, 1), 30);
        org.items = Array.from({ length: count }, (_, i) => ({
          no: Number(items[i]?.no) || i + 1,
          name: clean(items[i]?.name, 60),
          status: clean(items[i]?.status, 20) || 'bos',
          ts: Number(items[i]?.ts) || 0
        }));
      } else {
        org.zikirAd = clean(input.zikirAd, 60);
        org.hedef = Math.max(1, Math.min(10000000, Number(input.hedef) || 1));
        if (!org.zikirAd) return json({ error: 'Zikir adı gerekli.' }, 400);
      }

      await saveOrg(store, org);
      await store.set(`admin:${adminToken}`, code);
      return json({ code, adminToken, org: publicView(org, true) });
    }

    let code = clean(p.code, 32);
    let isAdmin = false;
    if (p.adminToken) {
      const resolved = await store.get(`admin:${clean(p.adminToken, 64)}`);
      if (resolved) {
        code = resolved;
        isAdmin = true;
      }
    }

    const org = await readOrg(store, code);
    if (!org) return json({ error: 'Organizasyon bulunamadı.' }, 404);

    if (p.action === 'get') return json(publicView(org, isAdmin));

    if (p.action === 'claim') {
      if (org.type !== 'hatim') return json({ error: 'Bu işlem sadece hatim içindir.' }, 400);
      const no = Number(p.no);
      const name = clean(p.name, 60);
      const item = org.items.find((x) => Number(x.no) === no);
      if (!item) return json({ error: 'Cüz bulunamadı.' }, 404);
      if (!name) return json({ error: 'İsim gerekli.' }, 400);
      if (item.name && item.status !== 'bos') return json({ error: 'Bu cüz zaten alınmış.' }, 409);
      item.name = name;
      item.status = 'alindi';
      item.ts = Date.now();
      await saveOrg(store, org);
      return json(publicView(org, isAdmin));
    }

    if (p.action === 'release') {
      if (org.type !== 'hatim') return json({ error: 'Bu işlem sadece hatim içindir.' }, 400);
      const no = Number(p.no);
      const item = org.items.find((x) => Number(x.no) === no);
      if (!item) return json({ error: 'Cüz bulunamadı.' }, 404);
      item.name = '';
      item.status = 'bos';
      item.ts = Date.now();
      await saveOrg(store, org);
      return json(publicView(org, isAdmin));
    }

    if (p.action === 'complete') {
      if (org.type !== 'hatim') return json({ error: 'Bu işlem sadece hatim içindir.' }, 400);
      const no = Number(p.no);
      const item = org.items.find((x) => Number(x.no) === no);
      if (!item) return json({ error: 'Cüz bulunamadı.' }, 404);
      item.status = 'tamamlandi';
      item.ts = Date.now();
      await saveOrg(store, org);
      return json(publicView(org, isAdmin));
    }

    if (p.action === 'contribute') {
      if (org.type !== 'zikir') return json({ error: 'Bu işlem sadece zikir içindir.' }, 400);
      const name = clean(p.name, 60);
      const amount = Math.max(1, Math.min(1000000, Number(p.amount) || 0));
      if (!name || !amount) return json({ error: 'İsim ve sayı gerekli.' }, 400);
      org.contributions.push({ name, amount, ts: Date.now() });
      await saveOrg(store, org);
      return json(publicView(org, isAdmin));
    }

    if (p.action === 'adminSet') {
      if (!isAdmin) return json({ error: 'Yönetici yetkisi gerekli.' }, 403);
      if (org.type !== 'hatim') return json({ error: 'Bu işlem sadece hatim içindir.' }, 400);
      const no = Number(p.no);
      const item = org.items.find((x) => Number(x.no) === no);
      if (!item) return json({ error: 'Cüz bulunamadı.' }, 404);
      if ('name' in p) item.name = clean(p.name, 60);
      if ('status' in p) item.status = clean(p.status, 20) || 'bos';
      item.ts = Date.now();
      await saveOrg(store, org);
      return json(publicView(org, true));
    }

    return json({ error: 'Bilinmeyen işlem.' }, 400);
  } catch (error) {
    return json({ error: error?.message || 'Sunucu hatası.' }, 500);
  }
};

export const config = { path: '/api/org' };
