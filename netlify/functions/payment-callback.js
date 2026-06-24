const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const body = event.body || '';
    const params = new URLSearchParams(body);
    const status = params.get('status_id');
    const refNo = params.get('billExternalReferenceNo');
    const billCode = params.get('billcode');

    console.log('payment-callback', { status, refNo, billCode });

    if (status === '1' && refNo) {
      const store = getStore({ name: 'submissions', consistency: 'strong' });
      const rec = await store.get(refNo, { type: 'json' });
      if (rec) {
        await store.setJSON(refNo, {
          ...rec,
          paid: true,
          status: 'Paid',
          paidAt: new Date().toISOString(),
          billCode,
        });
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('payment-callback error', err);
    return { statusCode: 200, body: 'OK' };
  }
};
