const { test, expect } = require('@playwright/test');

test.describe('Flask API bağlantı köprüsü', () => {
  test('kapalıyken API adresi uydurmaz ve açıklayıcı hata verir', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ url: '/js/modules/study-api.js' });

    const result = await page.evaluate(async () => {
      const api = window.VeterinerAkademiStudyApi;
      try {
        await api.health();
        return { configured: api.configured, error: null };
      } catch (error) {
        return { configured: api.configured, error: error.message };
      }
    });

    expect(result.configured).toBe(false);
    expect(result.error).toContain('API adresini ayarladıktan sonra');
  });

  test('yazma isteğinde önce CSRF alır ve oturum çerezlerini dahil eder', async ({ page }) => {
    await page.addInitScript(() => {
      window.VETERINER_AKADEMI_API_URL = 'https://api.example.test';
      window.__apiCalls = [];
      window.fetch = async (url, options = {}) => {
        window.__apiCalls.push({
          url: String(url),
          method: options.method || 'GET',
          credentials: options.credentials || 'same-origin',
          headers: Object.fromEntries(new Headers(options.headers || {}).entries()),
          body: options.body || null
        });

        if (String(url).endsWith('/api/auth/csrf')) {
          return new Response(JSON.stringify({ csrf_token: 'test-csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (String(url).endsWith('/api/notes')) {
          return new Response(JSON.stringify({ id: 7, title: 'Deneme notu', content: 'İçerik' }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ error: 'Beklenmeyen istek' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    });

    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ url: '/js/modules/study-api.js' });

    const result = await page.evaluate(async () => {
      const note = await window.VeterinerAkademiStudyApi.notes.create({
        title: 'Deneme notu',
        content: 'İçerik'
      });
      return { note, calls: window.__apiCalls };
    });

    expect(result.note.id).toBe(7);
    expect(result.calls).toHaveLength(2);
    expect(result.calls[0].url).toBe('https://api.example.test/api/auth/csrf');
    expect(result.calls[0].credentials).toBe('include');
    expect(result.calls[1].method).toBe('POST');
    expect(result.calls[1].credentials).toBe('include');
    expect(result.calls[1].headers['x-csrftoken']).toBe('test-csrf-token');
    expect(JSON.parse(result.calls[1].body)).toEqual({
      title: 'Deneme notu',
      content: 'İçerik'
    });
  });

  test('API hata yanıtını kullanıcıya aktarılabilir mesaja dönüştürür', async ({ page }) => {
    await page.addInitScript(() => {
      window.VETERINER_AKADEMI_API_URL = 'https://api.example.test';
      window.fetch = async (url) => {
        if (String(url).endsWith('/api/auth/csrf')) {
          return new Response(JSON.stringify({ csrf_token: 'test-csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ error: 'Not kaydedilemedi.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    });

    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ url: '/js/modules/study-api.js' });

    const message = await page.evaluate(async () => {
      try {
        await window.VeterinerAkademiStudyApi.notes.create({ title: 'X', content: 'Y' });
        return null;
      } catch (error) {
        return error.message;
      }
    });

    expect(message).toBe('Not kaydedilemedi.');
  });
});
