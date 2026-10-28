// Vercel Function: envia o evento Lead para a API de Conversões da Meta.
// Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   META_PIXEL_ID       = 1830415851737938
//   META_CAPI_ACCESS_TOKEN   = token da API de Conversões
//   META_TEST_EVENT_CODE (opcional, só para testes)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) {
    return res.status(500).json({ error: 'Variáveis de ambiente não configuradas' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { eventId, fbp, fbc, fbclid } = body;

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const sourceUrl = req.headers.referer || req.headers.origin;

  const now = Math.floor(Date.now() / 1000);
  const fbcFinal = fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);

  const userData = {
    client_ip_address: ip,
    client_user_agent: userAgent,
  };
  if (fbp) userData.fbp = fbp;
  if (fbcFinal) userData.fbc = fbcFinal;

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: now,
        event_id: eventId,
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data: userData,
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await r.json();
    return res.status(r.ok ? 200 : 502).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao chamar a Meta', detail: String(err) });
  }
}
