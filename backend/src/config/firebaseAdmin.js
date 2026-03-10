import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

let adminAuth;
let adminDb;

try {
  // If the user provided the JSON, we need to load it. 
  // We'll tell the user to save it as `firebase-service-account.json` in the root of backend/
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    adminAuth = admin.auth();
    adminDb = admin.firestore();
    console.log('Firebase Admin Initialized successfully.');
  } else {
    console.warn(`Firebase Admin Service Account file not found at ${serviceAccountPath}. Custom Email OTP and Firestore will fail.`);
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
}

export { adminAuth, adminDb };
