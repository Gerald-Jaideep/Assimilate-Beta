import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Support both environment variables and fallback to JSON for AI Studio convenience
const config = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseConfig.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfig.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfig.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfig.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || firebaseConfig.appId,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || firebaseConfig.measurementId,
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || firebaseConfig.firestoreDatabaseId
};

const app = initializeApp(config);
export const auth = getAuth(app);

// Initialize Firestore - avoid passing "(default)" explicitly as it can cause issues on some SDK versions
// Enable experimentalAutoDetectLongPolling to improve reliability in proxied previews
const firestoreSettings = {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
  host: 'firestore.googleapis.com',
  ssl: true,
};

const databaseId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' 
  ? config.firestoreDatabaseId 
  : undefined;

export const db = databaseId 
  ? initializeFirestore(app, firestoreSettings, databaseId)
  : initializeFirestore(app, firestoreSettings);

// Validate Connection to Firestore as per integration guidelines
async function testConnection() {
  try {
    // Attempt a lightweight server-side fetch to verify backend connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log("Firestore connection verified successfully.");
  } catch (error) {
    // If the client explicitly reports it's offline or times out, log a specific warning
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes("Backend didn't respond"))) {
      console.error("CRITICAL: Firestore backend unreachable. Please verify project settings and network permissions.");
    } else {
      // Ignore other errors during connection test (e.g. Permission Denied) as they mean we AT LEAST reached the server
      console.log("Firestore reachability confirmed (Auth/Permission check passed).");
    }
  }
}

// Execute test connection on module load
if (typeof window !== 'undefined') {
  testConnection();
}

export const storage = getStorage(app, config.storageBucket ? `gs://${config.storageBucket}` : undefined);

// Initialize analytics only if measurementId is present and in browser
export const analytics = typeof window !== 'undefined' && config.measurementId 
  ? getAnalytics(app) 
  : null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Removed testConnection() call - diagnostic check no longer needed here as it may interfere with SDK startup in restricted networks.
