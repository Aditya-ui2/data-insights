// Google OAuth for Sheets access
import { storage } from "./storage";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

export function isGoogleOAuthConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function getGoogleAuthUrl(redirectUri: string, userId: string): string {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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
}

export async function listSpreadsheets(accessToken: string): Promise<GoogleSpreadsheet[]> {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id,name)',
      pageSize: '50'
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error('Failed to list spreadsheets');
  }

  const data = await response.json();
  const spreadsheets: GoogleSpreadsheet[] = [];

  for (const file of data.files || []) {
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (sheetsResponse.ok) {
      const sheetsData = await sheetsResponse.json();
      spreadsheets.push({
        id: file.id,
        name: file.name,
        sheets: (sheetsData.sheets || []).map((s: any) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title
        }))
      });
    }
  }

  return spreadsheets;
}

export async function getSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<{ headers: string[]; data: Record<string, any>[] }> {
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

  const headers = rows[0] as string[];
  const data = rows.slice(1).map((row: any[]) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? null;
    });
    return obj;
  });

  return { headers, data };
}
