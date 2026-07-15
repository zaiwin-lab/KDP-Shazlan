const { getStore } = require('@netlify/blobs');
const supabase = require('./lib/supabase');

exports.handler = async (event) => {
  try {
    const body = event.body || '';
    const params = new URLSearchParams(body);
    const status = params.get('status_id');
    const refNo = params.get('billExternalReferenceNo');
    const billCode = params.get('billcode');
    const paidAmount = params.get('amount'); // ToyyibPay reports in the smallest unit

    console.log('payment-callback', { status, refNo, billCode });

    if (status === '1' && refNo) {
      const store = getStore({ name: 'submissions', consistency: 'strong', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
      const rec = await store.get(refNo, { type: 'json' });
      if (rec) {
        const updated = {
          ...rec,
          paid: true,
          status: 'Paid',
          paidAt: new Date().toISOString(),
          paidAmount: paidAmount ? Number(paidAmount) / 100 : rec.paidAmount,
          billCode,
        };
        await store.setJSON(refNo, updated);
        try { await supabase.upsertRow(updated); } catch (e) { console.error('supabase mirror (paid):', e.message); }
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('payment-callback error', err);
    return { statusCode: 200, body: 'OK' };
  }
};
