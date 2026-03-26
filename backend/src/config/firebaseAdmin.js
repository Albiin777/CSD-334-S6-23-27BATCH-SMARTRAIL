import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

let _serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

function initFirebase() {
  try {
    let serviceAccount = null;

    // Priority 1: Environment variable (for Railway/Render/cloud deployments)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Firebase: Using service account from FIREBASE_SERVICE_ACCOUNT env var.');
      } catch (parseErr) {
        console.error('Firebase: Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', parseErr.message);
      }
    }

    // Priority 2: Local JSON file (for local development)
    if (!serviceAccount && existsSync(_serviceAccountPath)) {
      serviceAccount = JSON.parse(readFileSync(_serviceAccountPath, 'utf8'));
      console.log('Firebase: Using service account from local file.');
    }

    if (!serviceAccount) {
      console.warn('Firebase: No service account found. Set FIREBASE_SERVICE_ACCOUNT env var or place firebase-service-account.json in the project root.');
      return;
    }

    // If already initialized, just return (token refresh is automatic with cert credentials)
    if (admin.apps.length) {
      console.log('Firebase Admin already initialized, reusing existing app.');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin Initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

// Initialize once at startup
initFirebase();

/**
 * Always use getDb() to get a fresh Firestore reference.
 * Firebase Admin SDK automatically handles token refresh for cert-based credentials.
 */
function getDb() {
  if (!admin.apps.length) {
    initFirebase();
  }
  return admin.firestore();
}

function getAuth() {
  if (!admin.apps.length) {
    initFirebase();
  }
  return admin.auth();
}

const FieldValue = admin.firestore.FieldValue;

// Backward compat: adminDb and adminAuth still exported for existing imports,
// but getDb()/getAuth() are more resilient.
const adminDb = admin.apps.length ? admin.firestore() : null;
const adminAuth = admin.apps.length ? admin.auth() : null;

export { adminAuth, adminDb, FieldValue, getDb, getAuth };

