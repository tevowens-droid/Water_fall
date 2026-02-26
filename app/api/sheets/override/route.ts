import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

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

export async function POST(req: NextRequest) {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  if (!SHEET_ID) {
    return NextResponse.json({ error: 'Missing GOOGLE_SHEET_ID environment variable' }, { status: 500 });
  }

  try {
    const { rowNumber, value, week } = await req.json();
    const col   = week === 'nextWeek' ? 'J' : 'D';
    const range = `Paycheck_Input!${col}${rowNumber}`;
    const cellValue = (value === null || value === '') ? '' : Number(value);

    const sheets = getSheets();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[cellValue]] },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Sheets override error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
