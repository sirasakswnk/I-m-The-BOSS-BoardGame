import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth, type User } from 'firebase/auth';
import {
  connectDatabaseEmulator,
  getDatabase,
  type Database,
} from 'firebase/database';

interface FirebaseContext {
  app: FirebaseApp;
  auth: Auth;
  db: Database;
}

export class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseConfigError';
  }
}

const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

let cached: FirebaseContext | null = null;
let pendingAuth: Promise<User> | null = null;

function envValue(key: (typeof REQUIRED_ENV)[number]): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readFirebaseConfig() {
  const missing = REQUIRED_ENV.filter((key) => !envValue(key));
  if (missing.length > 0) {
    throw new FirebaseConfigError(
      `Missing Firebase configuration: ${missing.join(', ')}. Add them to .env.local.`,
    );
  }

  return {
    apiKey: envValue('VITE_FIREBASE_API_KEY'),
    authDomain: envValue('VITE_FIREBASE_AUTH_DOMAIN'),
    databaseURL: envValue('VITE_FIREBASE_DATABASE_URL'),
    projectId: envValue('VITE_FIREBASE_PROJECT_ID'),
    appId: envValue('VITE_FIREBASE_APP_ID'),
  };
}

/**
 * Lazily initializes Firebase once. Keeping initialization lazy lets the app
 * render a clear configuration error instead of crashing at import time.
 */
export function getFirebase(): FirebaseContext {
  if (cached) return cached;

  const app = initializeApp(readFirebaseConfig());
  const auth = getAuth(app);
  const db = getDatabase(app);

  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectDatabaseEmulator(db, '127.0.0.1', 9000);
  }

  cached = { app, auth, db };
  return cached;
}

/**
 * Returns the current anonymous user, signing in once if needed. Concurrent
 * callers share the same sign-in promise.
 */
export async function ensureAnonymousAuth(): Promise<User> {
  const { auth } = getFirebase();
  if (auth.currentUser) return auth.currentUser;

  if (!pendingAuth) {
    pendingAuth = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        pendingAuth = null;
      });
  }

  return pendingAuth;
}
