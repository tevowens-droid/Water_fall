import { google } from 'googleapis';
import { NextResponse } from 'next/server';

function getSheets() {
  let credentials: { client_email: string; private_key: string };
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonKey) {
    const parsed = JSON.parse(jsonKey);
    credentials = { client_email: parsed.client_email, private_key: parsed.private_key };
  } else {
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',
      private_key:  (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    };
  }
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

export async function GET() {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  if (!SHEET_ID) {
    return NextResponse.json({ error: 'Missing GOOGLE_SHEET_ID environment variable' }, { status: 500 });
  }
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Allocations_History!A:C',
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const rows = (res.data.values ?? []).slice(1);
    const history = rows
      .filter(r => r[0] && r[1])
      .map(r => ({
        date:     String(r[0]),
        category: String(r[1]),
        amount:   parseFloat(String(r[2] ?? '0').replace(/[$,]/g, '')) || 0,
      }));
    return NextResponse.json(history);
  } catch (err) {
    console.error('Sheets history error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
