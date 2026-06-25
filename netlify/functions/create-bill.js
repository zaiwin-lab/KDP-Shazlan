const { getStore } = require('@netlify/blobs');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
};

function sanitize(str) {
  return String(str || '').replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 100);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { amount, business, owner, email, phone, id, addons } = JSON.parse(event.body || '{}');

    // auto-fill from record if id provided
    let resolvedEmail = email;
    let resolvedPhone = phone;
    if (id && (!email || !phone)) {
      const store = getStore({ name: 'submissions', consistency: 'strong', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
      const rec = await store.get(id, { type: 'json' });
      if (rec) {
        resolvedEmail = resolvedEmail || rec.email;
        resolvedPhone = resolvedPhone || rec.mobile;
      }
    }

    const secret = process.env.TOYYIBPAY_SECRET;
    const category = process.env.TOYYIBPAY_CATEGORY;
    if (!secret || !category) throw new Error('ToyyibPay not configured');

    const billName = sanitize(`KSDC ${business}`);
    const billDesc = sanitize(`Pendaftaran Program KSDC ${owner}`);
    const totalAmount = Math.round(Number(amount) * 100);
    const callbackUrl = `${process.env.URL || 'https://syahlansdc.netlify.app'}/.netlify/functions/payment-callback`;
    const returnUrl = `${process.env.URL || 'https://syahlansdc.netlify.app'}/pay.html`;

    const params = new URLSearchParams({
      userSecretKey: secret,
      categoryCode: category,
      billName,
      billDescription: billDesc,
      billPriceSetting: 1,
      billPayorInfo: 1,
      billAmount: totalAmount,
      billReturnUrl: returnUrl,
      billCallbackUrl: callbackUrl,
      billExternalReferenceNo: id || `TXN-${Date.now()}`,
      billTo: sanitize(owner),
      billEmail: resolvedEmail || '',
      billPhone: (resolvedPhone || '').replace(/\D/g, ''),
      billSplitPayment: 0,
      billSplitPaymentArgs: '',
      billPaymentChannel: 0,
      billContentEmail: `Terima kasih ${sanitize(owner)}! Pembayaran KSDC anda telah diterima.`,
      billChargeToCustomer: 1,
    });

    const res = await fetch('https://toyyibpay.com/index.php/api/createBill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const json = await res.json();
    if (!json?.[0]?.BillCode) throw new Error(`ToyyibPay error: ${JSON.stringify(json)}`);

    const billCode = json[0].BillCode;
    const payUrl = `https://toyyibpay.com/${billCode}`;
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true, billCode, payUrl }) };
  } catch (err) {
    console.error('create-bill error', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
