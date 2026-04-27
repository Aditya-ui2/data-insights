import type { RequestHandler, Express } from "express";
import { storage } from "./storage";

interface DecodedToken {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
}

interface FirebasePublicKeys {
  [kid: string]: string;
}

let cachedKeys: FirebasePublicKeys | null = null;
let keysExpiry: number = 0;

async function getFirebasePublicKeys(): Promise<FirebasePublicKeys> {
  const now = Date.now();
  
  if (cachedKeys && now < keysExpiry) {
    return cachedKeys;
  }

  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Firebase public keys');
  }

  const cacheControl = response.headers.get('cache-control');
  let maxAge = 3600;
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      maxAge = parseInt(match[1], 10);
    }
  }

  cachedKeys = await response.json();
  keysExpiry = now + maxAge * 1000;

  return cachedKeys!;
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

async function verifyFirebaseToken(idToken: string): Promise<DecodedToken | null> {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "datainsights-ce470";
    console.log("[Firebase Auth] Using project ID:", projectId);
    
    if (!projectId) {
      console.error("[Firebase Auth] VITE_FIREBASE_PROJECT_ID not set");
      return null;
    }

    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.error("[Firebase Auth] Invalid JWT format - parts:", parts.length);
      return null;
    }

    const headerStr = base64UrlDecode(parts[0]);
    const payloadStr = base64UrlDecode(parts[1]);
    
    let header: { alg: string; kid: string };
    let payload: any; // Use any to capture all fields
    
    try {
      header = JSON.parse(headerStr);
      payload = JSON.parse(payloadStr);
      console.log("[Firebase Auth] Token payload:", JSON.stringify({
        iss: payload.iss,
        aud: payload.aud,
        sub: payload.sub,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat
      }, null, 2));
    } catch (e) {
      console.error("[Firebase Auth] Failed to parse JWT:", e);
      return null;
    }

    if (header.alg !== 'RS256') {
      console.error("[Firebase Auth] Invalid JWT algorithm:", header.alg);
      return null;
    }

    const iss = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== iss) {
      console.error("[Firebase Auth] Invalid issuer. Got:", payload.iss, "Expected:", iss);
      return null;
    }

    if (payload.aud !== projectId) {
      console.error("[Firebase Auth] Invalid audience. Got:", payload.aud, "Expected:", projectId);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    console.log("[Firebase Auth] Time check - now:", now, "exp:", payload.exp, "iat:", payload.iat);
    
    if (payload.exp && payload.exp < now) {
      console.error("[Firebase Auth] Token expired. exp:", payload.exp, "now:", now);
      return null;
    }

    if (payload.iat && payload.iat > now + 300) {
      console.error("[Firebase Auth] Token issued in future. iat:", payload.iat, "now:", now);
      return null;
    }

    if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length === 0) {
      console.error("[Firebase Auth] Invalid subject:", payload.sub);
      return null;
    }

    const keys = await getFirebasePublicKeys();
    console.log("[Firebase Auth] Checking kid:", header.kid, "Available keys:", Object.keys(keys).length);
    
    if (!header.kid || !keys[header.kid]) {
      console.error("[Firebase Auth] Key ID not found. kid:", header.kid);
      return null;
    }

    console.log("[Firebase Auth] Token verified successfully for:", payload.email, "uid:", payload.sub);
    
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error("[Firebase Auth] Critical error verifying token:", error);
    return null;
  }
}

export async function setupFirebaseAuth(app: Express) {
  app.set("trust proxy", 1);
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyFirebaseToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const nameParts = decoded.name?.split(" ") || [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(" ") || null;

    let dbUser;
    try {
      dbUser = await storage.upsertUser({
        id: decoded.sub,
        email: decoded.email || null,
        firstName,
        lastName,
        profileImageUrl: decoded.picture || null,
      });
    } catch (dbError) {
      console.error("[Firebase Auth] Database upsert failed:", dbError);
      return res.status(500).json({ 
        message: "Database error during login. Make sure you have run 'npm run db:push'.",
        error: process.env.NODE_ENV === 'development' ? dbError : undefined
      });
    }

    req.user = {
      claims: {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      },
      dbUser,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// Optional auth — populates req.user if a valid token is present, never rejects
export const optionalAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = await verifyFirebaseToken(token);
      if (decoded) {
        const nameParts = decoded.name?.split(" ") || [];
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(" ") || null;
        const dbUser = await storage.upsertUser({
          id: decoded.sub,
          email: decoded.email || null,
          firstName,
          lastName,
          profileImageUrl: decoded.picture || null,
        });
        req.user = {
          claims: { sub: decoded.sub, email: decoded.email, name: decoded.name, picture: decoded.picture },
          dbUser,
        };
      }
    }
  } catch {
    // ignore errors — just proceed unauthenticated
  }
  next();
};

// Extend Express Request to include custom user object
declare global {
  namespace Express {
    interface Request {
      user?: {
        claims: {
          sub: string;
          email?: string;
          name?: string;
          picture?: string;
        };
        dbUser: any;
      };
    }
  }
}
