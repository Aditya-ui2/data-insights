// Google OAuth for Sheets access
import { storage } from "./storage";
import * as XLSX from "xlsx";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.currentonly',
  'https://www.googleapis.com/auth/drive.file'
];

export function isGoogleOAuthConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

// Returns the expected redirect URI for the current port - useful for debugging
export function getExpectedRedirectUri(req?: { headers: any; protocol: string; get: (h: string) => string | undefined }): string {
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api/google/callback`;
  }
  const port = process.env.PORT || '5002';
  return `http://localhost:${port}/api/google/callback`;
}

export function getGoogleAuthUrl(redirectUri: string, userId: string, loginHint?: string): string {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const params: Record<string, string> = {
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    state
  };
  if (loginHint) {
    params.login_hint = loginHint;
  }
  const searchParams = new URLSearchParams(params);
  return `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;
}

export function parseOAuthState(state: string): { userId: string } | null {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return null;
  }
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const user = await storage.getUser(userId);
  if (!user?.googleAccessToken) return null;

  const now = new Date();
  const expiry = user.googleTokenExpiry;
  
  if (expiry && expiry > now) {
    return user.googleAccessToken;
  }

  if (user.googleRefreshToken) {
    try {
      const newToken = await refreshAccessToken(user.googleRefreshToken);
      await storage.updateUser(userId, {
        googleAccessToken: newToken,
        googleTokenExpiry: new Date(Date.now() + 3600 * 1000)
      });
      return newToken;
    } catch (error) {
      console.error('Failed to refresh Google token:', error);
      return null;
    }
  }

  return null;
}

export interface GoogleSpreadsheet {
  id: string;
  name: string;
  sheets: { sheetId: number; title: string }[];
  fileType?: 'sheet' | 'excel' | 'csv' | 'pdf';
  mimeType?: string;
}

export async function listSpreadsheets(accessToken: string): Promise<GoogleSpreadsheet[]> {
  // Fetch all supported file types in one query
  const mimeTypes = [
    "mimeType='application/vnd.google-apps.spreadsheet'",
    "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'", // .xlsx
    "mimeType='application/vnd.ms-excel'",                                           // .xls
    "mimeType='text/csv'",                                                            // .csv
    "mimeType='application/pdf'",                                                     // .pdf
  ].join(' or ');

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      q: `(${mimeTypes}) and trashed=false`,
      fields: 'files(id,name,mimeType)',
      pageSize: '100',
      orderBy: 'modifiedTime desc'
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error('Failed to list spreadsheets');
  }

  const data = await response.json();
  const spreadsheets: GoogleSpreadsheet[] = [];

  for (const file of data.files || []) {
    const mime: string = file.mimeType || '';

    if (mime === 'application/vnd.google-apps.spreadsheet') {
      // Google Sheet — fetch individual sheet tabs
      const sheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (sheetsResponse.ok) {
        const sheetsData = await sheetsResponse.json();
        spreadsheets.push({
          id: file.id,
          name: file.name,
          fileType: 'sheet',
          mimeType: mime,
          sheets: (sheetsData.sheets || []).map((s: any) => ({
            sheetId: s.properties.sheetId,
            title: s.properties.title
          }))
        });
      }
    } else if (mime === 'application/pdf') {
      spreadsheets.push({
        id: file.id,
        name: file.name,
        fileType: 'pdf',
        mimeType: mime,
        sheets: [{ sheetId: 0, title: 'PDF Data' }]
      });
    } else if (mime === 'text/csv') {
      spreadsheets.push({
        id: file.id,
        name: file.name,
        fileType: 'csv',
        mimeType: mime,
        sheets: [{ sheetId: 0, title: 'Sheet1' }]
      });
    } else {
      // Excel .xlsx / .xls
      spreadsheets.push({
        id: file.id,
        name: file.name,
        fileType: 'excel',
        mimeType: mime,
        sheets: [{ sheetId: 0, title: 'Sheet1' }]
      });
    }
  }

  return spreadsheets;
}

export async function getSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  mimeType?: string
): Promise<{ headers: string[]; data: Record<string, any>[] }> {

  // Handle non-Google-Sheet files: download from Drive and parse via Python backend
  if (mimeType && mimeType !== 'application/vnd.google-apps.spreadsheet') {
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!downloadRes.ok) {
      throw new Error('Failed to download file from Drive');
    }
    const buffer = Buffer.from(await downloadRes.arrayBuffer());
    const fileName = `file.${mimeType === 'application/pdf' ? 'pdf' : mimeType.includes('csv') ? 'csv' : 'xlsx'}`;

    // Call Python backend to parse + RAG index
    const docId = spreadsheetId;
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), fileName);
    formData.append('userId', 'system');
    formData.append('documentId', docId);

    const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
    const parseRes = await fetch(`${PYTHON_URL}/parse-document`, {
      method: 'POST',
      body: formData,
    });

    if (!parseRes.ok) {
      const errorText = await parseRes.text();
      let errorMsg = "Python backend failed to parse file";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'object' ? JSON.stringify(errorJson.detail) : errorJson.detail;
        } else if (errorJson.message) {
          errorMsg = errorJson.message;
        }
      } catch {
        if (errorText) errorMsg = errorText;
      }
      throw new Error(errorMsg);
    }

    const parsed = await parseRes.json() as { headers: string[]; rows: Record<string, any>[] };
    return { headers: parsed.headers, data: parsed.rows };
  }

  // Default: Google Sheets API
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch sheet data');
  }

  const result = await response.json();
  const rows = result.values || [];
  
  if (rows.length === 0) {
    return { headers: [], data: [] };
  }

  // Forward the 2D grid values to the Python backend to apply layout detection & cleaning
  const PYTHON_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
  const parseRes = await fetch(`${PYTHON_URL}/parse-sheet-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sheetName,
      grid: rows,
      documentId: spreadsheetId
    })
  });

  if (!parseRes.ok) {
    const errorText = await parseRes.text();
    throw new Error(`Python backend failed to parse sheet: ${errorText}`);
  }

  const parsed = await parseRes.json() as { headers: string[]; rows: Record<string, any>[] };
  return { headers: parsed.headers, data: parsed.rows };
}
