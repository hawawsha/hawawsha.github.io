// ============================================================
// الملف: pages/api/refund.js
// ✅ نسخة Debug آمنة بدون تغيير منطق النظام
// ============================================================

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;

function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>'"]/g, '');
}

export default async function handler(req, res) {

  // ============================================================
  // GET
  // ============================================================

  if (req.method === 'GET') {

    const action = req.query?.action;

    if (action === 'list') {

      try {

        const response = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds?sort[0][field]=created_at&sort[0][direction]=desc`,
          {
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`
            }
          }
        );

        const data = await response.json();

        return res.status(200).json({
          records: data.records || []
        });

      } catch (err) {

        console.error('GET LIST ERROR:', err);

        return res.status(500).json({
          error: 'Internal Server Error'
        });

      }

    }

    return res.status(400).json({
      error: 'action غير صالح'
    });

  }

  // ============================================================
  // POST
  // ============================================================

  if (req.method === 'POST') {

    const action = sanitize(req.body?.action, 20).toLowerCase();

    // ============================================================
    // APPROVE REFUND
    // ============================================================

    if (action === 'approve') {

      const recordId = sanitize(req.body?.recordId, 100);

      if (!recordId) {

        return res.status(400).json({
          error: 'recordId مطلوب'
        });

      }

      try {

        console.log('====================================');
        console.log('✅ APPROVE REQUEST STARTED');
        console.log('====================================');

        console.log('RECORD ID:', recordId);

        console.log('TOKEN EXISTS:', !!AIRTABLE_TOKEN);
        console.log('BASE EXISTS:', !!AIRTABLE_BASE);

        const airtableUrl =
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`;

        console.log('URL:', airtableUrl);

        const requestBody = {
          fields: {
            status: 'approved',
            approved_at: new Date().toISOString()
          }
        };

        console.log('REQUEST BODY:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(
          airtableUrl,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          }
        );

        console.log('AIRTABLE STATUS:', response.status);

        let data = null;

        try {

          data = await response.json();

        } catch (jsonErr) {

          console.error('JSON PARSE ERROR:', jsonErr);

          const rawText = await response.text();

          console.log('RAW RESPONSE:', rawText);

          return res.status(500).json({
            error: 'Airtable did not return JSON',
            raw: rawText
          });

        }

        console.log('AIRTABLE RESPONSE DATA:');
        console.log(JSON.stringify(data, null, 2));

        if (!response.ok) {

          console.error('❌ AIRTABLE UPDATE FAILED');

          return res.status(response.status).json({
            error: 'Airtable update failed',
            details: data
          });

        }

        console.log('✅ REFUND APPROVED SUCCESSFULLY');

        return res.status(200).json({
          success: true,
          record: data
        });

      } catch (err) {

        console.error('🔥 APPROVE ERROR:', err);

        return res.status(500).json({
          error: err.message || 'Unknown server error'
        });

      }

    }

    // ============================================================
    // REJECT REFUND
    // ============================================================

    if (action === 'reject') {

      const recordId = sanitize(req.body?.recordId, 100);

      if (!recordId) {

        return res.status(400).json({
          error: 'recordId مطلوب'
        });

      }

      try {

        const response = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Refunds/${recordId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                status: 'rejected',
                rejected_at: new Date().toISOString()
              }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {

          return res.status(response.status).json({
            error: 'Airtable reject failed',
            details: data
          });

        }

        return res.status(200).json({
          success: true
        });

      } catch (err) {

        return res.status(500).json({
          error: err.message
        });

      }

    }

    return res.status(400).json({
      error: 'action غير صالح'
    });

  }

  return res.status(405).json({
    error: 'Method not allowed'
  });

}