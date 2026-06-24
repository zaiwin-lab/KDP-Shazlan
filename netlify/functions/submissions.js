const { getStore } = require('@netlify/blobs');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
};

async function notifyNewLead(data) {
  const endpoint = process.env.WATI_ENDPOINT;
  const token = process.env.WATI_TOKEN;
  const to = process.env.WATI_NOTIFY_TO;
  const template = process.env.WATI_TEMPLATE || 'new_chat_v1';
  if (!endpoint || !token || !to) return;

  const params =
    template === 'new_lead_alert'
      ? [
          { name: 'name', value: data.ownerName || '-' },
          { name: 'business', value: data.businessName || '-' },
          { name: 'district', value: data.district || '-' },
          { name: 'mobile', value: data.mobile || '-' },
          { name: 'score', value: String(data.leadScore || 0) },
        ]
      : [{ name: 'name', value: data.ownerName || data.businessName || '-' }];

  try {
    await fetch(`${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${to}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_name: template, broadcast_name: template, parameters: params }),
    });
  } catch (_) {}
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const store = getStore({ name: 'submissions', consistency: 'strong' });

  try {
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;
      if (id) {
        const rec = await store.get(id, { type: 'json' });
        if (!rec) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers: cors, body: JSON.stringify(rec) };
      }
      // list all — eventual is fine for dashboard poll
      const listStore = getStore({ name: 'submissions' });
      const { blobs } = await listStore.list();
      const records = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
      return { statusCode: 200, headers: cors, body: JSON.stringify(records.filter(Boolean)) };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      if (!data.id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing id' }) };
      const existing = await store.get(data.id, { type: 'json' });
      await store.setJSON(data.id, data);
      if (!existing && data.businessName) await notifyNewLead(data);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'PATCH') {
      const id = event.queryStringParameters?.id;
      if (!id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing id' }) };
      const existing = await store.get(id, { type: 'json' });
      if (!existing) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'Not found' }) };
      const patch = JSON.parse(event.body || '{}');
      await store.setJSON(id, { ...existing, ...patch });
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing id' }) };
      await store.delete(id);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('submissions error', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
