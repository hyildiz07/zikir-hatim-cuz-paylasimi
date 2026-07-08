// ELİFA Birlikte — ortak organizasyon deposu (Netlify Blobs)
// Tek uç nokta: POST /api/org  { action, ... }
// Veri modeli HatimLink dokümanıyla uyumlu: organizations + items + responses mantığı
// tek belge içinde tutulur (V1 için yeterli, trafik düşük).
import { getStore } from '@netlify/blobs';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const randCode = (n) => {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  for (let i = 0; i < n; i++) s += abc[arr[i] % abc.length];
  return s;
};

// Gizlilik kuralı: toplu zikirde kişi başı sayı DIŞARI VERİLMEZ.
// Sadece toplam ve katılan isimleri döner. Hatimde isim+cüz+durum açıktır (görev kaydı).
function publicView(org, isAdmin) {
  const v = {
    type: org.type, title: org.title, zikirAd: org.zikirAd, hedef: org.hedef,
    dueDate: org.dueDate, adminName: org.adminName, createdAt: org.createdAt,
    items: org.items, isAdmin: !!isAdmin,
  };
  if (org.type === 'zikir') {
    const c = org.contributions || [];
    v.toplam = c.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    v.katilanlar = [...new Set(c.map((x) => x.name))];
  }
  return v;
}

const clean = (s, max) => String(s == null ? '' : s).slice(0, max).trim();

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Sadece POST' }, 405);
  const store = getStore('elifa-birlikte');

  let p;
  try { p = await req.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }

  try {
    // ---- Oluştur ----
    if (p.action === 'create') {
      const o = p.org || {};
      if (!['hatim', 'zikir'].includes(o.type)) return json({ error: 'Geçersiz tür' }, 400);
      const title = clean(o.title, 120);
      if (!title) return json({ error: 'Niyet/başlık gerekli' }, 400);

      const code = randCode(6);
      const adminToken = randCode(12);
      const org = {
        code, adminToken, type: o.type, title,
        adminName: clean(o.adminName, 60),
        dueDate: clean(o.dueDate, 10) || null,
        createdAt: Date.now(),
        items: [], contributions: [],
      };
      if (o.type === 'hatim') {
        const items = Array.isArray(o.items) ? o.items : [];
        if (!items.length || items.length > 30) return json({ error: 'Geçersiz cüz listesi' }, 400);
        org.items = items.map((i) => ({ no: Number(i.no), name: '', status: 'bos', ts: 0 }));
      } else {
        org.zikirAd = clean(o.zikirAd, 60);
        org.hedef = Math.max(1, Math.min(10000000, Number(o.hedef) || 0));
        if (!org.zikirAd) return json({ error: 'Zikir adı gerekli' }, 400);
      }
      await store.setJSON('org:' + code, org);
      await store.set('admin:' + adminToken, code);
      return json({ code, adminToken });
    }

    // ---- Kod çözümleme (katılım kodu ya da yönetici anahtarı) ----
    let code = clean(p.code, 20);
    let isAdmin = false;
    if (!code && p.admin) {
      code = await store.get('admin:' + clean(p.admin, 30));
      if (!code) return json({ error: 'Organizasyon bulunamadı' }, 404);
    }
    const org = await store.get('org:' + code, { type: 'json' });
    if (!org) return json({ error: 'Organizasyon bulunamadı' }, 404);
    if (p.admin && p.admin === org.adminToken) isAdmin = true;

    // ---- Görüntüle ----
    if (p.action === 'get') return json({ org: publicView(org, isAdmin), code });

    // ---- Cüz al ----
    if (p.action === 'claim') {
      const name = clean(p.name, 60);
      if (name.length < 2) return json({ error: 'İsim gerekli' }, 400);
      const it = (org.items || []).find((i) => i.no === Number(p.no));
      if (!it) return json({ error: 'Cüz bulunamadı' }, 404);
      if (it.status !== 'bos') return json({ error: 'Bu cüz az önce başkası tarafından alındı' }, 409);
      it.status = 'alindi'; it.name = name; it.ts = Date.now();
      await store.setJSON('org:' + code, org);
      return json({ org: publicView(org, isAdmin), code });
    }

    // ---- Cüzü bırak (yanlışlıkla alındıysa geri ver) ----
    if (p.action === 'release') {
      const it = (org.items || []).find((i) => i.no === Number(p.no));
      if (!it) return json({ error: 'Cüz bulunamadı' }, 404);
      if (it.status !== 'alindi') return json({ error: 'Sadece alınmış (henüz okunmamış) cüz bırakılabilir' }, 409);
      it.status = 'bos'; it.name = ''; it.ts = Date.now();
      await store.setJSON('org:' + code, org);
      return json({ org: publicView(org, isAdmin), code });
    }

    // ---- Okudum ----
    if (p.action === 'complete') {
      const it = (org.items || []).find((i) => i.no === Number(p.no));
      if (!it) return json({ error: 'Cüz bulunamadı' }, 404);
      if (it.status === 'bos') return json({ error: 'Bu cüz henüz alınmamış' }, 409);
      it.status = 'okundu'; it.ts = Date.now();
      await store.setJSON('org:' + code, org);
      return json({ org: publicView(org, isAdmin), code });
    }

    // ---- Ortak niyete pay ekle ----
    if (p.action === 'contribute') {
      if (org.type !== 'zikir') return json({ error: 'Bu bir zikir organizasyonu değil' }, 400);
      const name = clean(p.name, 60);
      const amount = Math.max(1, Math.min(100000, Number(p.amount) || 0));
      if (name.length < 2) return json({ error: 'İsim gerekli' }, 400);
      org.contributions = org.contributions || [];
      org.contributions.push({ name, amount, ts: Date.now() });
      await store.setJSON('org:' + code, org);
      return json({ org: publicView(org, isAdmin), code });
    }

    // ---- Yönetici düzeltmesi ----
    if (p.action === 'adminSet') {
      if (!isAdmin) return json({ error: 'Yetki yok' }, 403);
      const it = (org.items || []).find((i) => i.no === Number(p.no));
      if (!it) return json({ error: 'Cüz bulunamadı' }, 404);
      if (!['bos', 'alindi', 'okundu'].includes(p.status)) return json({ error: 'Geçersiz durum' }, 400);
      it.status = p.status;
      if (p.status === 'bos') it.name = '';
      it.ts = Date.now();
      await store.setJSON('org:' + code, org);
      return json({ org: publicView(org, true), code });
    }

    return json({ error: 'Bilinmeyen işlem' }, 400);
  } catch (e) {
    return json({ error: 'Sunucu hatası, lütfen tekrar deneyin' }, 500);
  }
};

export const config = { path: '/api/org' };
