import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA8nZGVW2I-XX78wujFkUNc8rbfQkUutCA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "datainsights-ce470.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "datainsights-ce470",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:33576582754:web:0d4ea58bd03af198731b3b",
};

// Singleton: reuse existing app on HMR
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Try localStorage → sessionStorage → in-memory, falling back if storage is blocked
// (common when running inside a Replit workspace iframe).
setPersistence(auth, browserLocalPersistence)
  .catch(() => setPersistence(auth, browserSessionPersistence))
  .catch(() => setPersistence(auth, inMemoryPersistence))
  .catch(() => {});

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || '';
  const errorMessages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups for this site and try again.',
    'auth/cancelled-popup-request': 'Another sign-in is in progress. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    'auth/requires-recent-login': 'Please sign in again to complete this action.',
    'auth/invalid-api-key': 'Configuration error. Please contact support.',
    'auth/app-deleted': 'The app has been deleted. Please refresh the page.',
    'auth/internal-error': 'An unexpected error occurred. Please try again.',
    'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Please contact support.',
  };
  
  return errorMessages[code] || error?.message || 'An unexpected error occurred. Please try again.';
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Google sign-in error:', error.code, error.message);
    return { user: null, error: getFirebaseErrorMessage(error) };
  }
}

export async function signInWithApple() {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Apple sign-in error:', error.code, error.message);
    return { user: null, error: getFirebaseErrorMessage(error) };
  }
}

let manualUser: FirebaseUser | null = null;
const authListeners = new Set<(user: FirebaseUser | null) => void>();

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  authListeners.add(callback);
  
  // Also keep the real firebase listener
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!manualUser) {
      callback(user);
    }
  });

  // Call immediately with current state
  callback(manualUser || auth.currentUser);

  return () => {
    authListeners.delete(callback);
    unsubscribe();
  };
}

export async function signInWithFacebook() {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Facebook sign-in error:', error.code, error.message);
    return { user: null, error: getFirebaseErrorMessage(error) };
  }
}

export async function signInWithEmail(email: string, password: string) {
  // Demo Bypass
  if (email === "admin@demodatainsights.com" && password === "Demo@1234") {
    console.log("[Auth] Using Demo Bypass credentials");
    manualUser = { 
      email: "admin@demodatainsights.com", 
      uid: "admin-demo-id",
      getIdToken: async () => "demo-token-123" 
    } as any;
    
    // Notify all listeners
    authListeners.forEach(cb => cb(manualUser));
    
    return { user: manualUser, error: null };
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Email sign-in error:', error.code, error.message);
    return { user: null, error: getFirebaseErrorMessage(error) };
  }
}

export async function signUpWithEmail(email: string, password: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Email sign-up error:', error.code, error.message);
    return { user: null, error: getFirebaseErrorMessage(error) };
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: any) {
    console.error('Password reset error:', error.code, error.message);
    return { error: getFirebaseErrorMessage(error) };
  }
}

export async function logOut() {
  try {
    manualUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("isDemoLoggedIn");
      localStorage.setItem("isDemoLoggedOut", "true");
    }
    await signOut(auth);
    // Notify all listeners of logout
    authListeners.forEach(cb => cb(null));
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getIdToken(): Promise<string | null> {
  if (manualUser) return manualUser.getIdToken();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export type { FirebaseUser };
