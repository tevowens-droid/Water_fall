import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function GET() {
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Allocations_History!A:C',
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = (res.data.values ?? []).slice(1); // skip header row
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
