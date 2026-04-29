/**
 * Firebase Admin SDK initialization
 * Uses serviceAccountKey.json for full Firestore + Auth access
 */
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  let credential;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase Admin: using FIREBASE_SERVICE_ACCOUNT_KEY env var');
    } else {
      const serviceAccount = require(path.join(__dirname, '..', '..', 'serviceAccountKey.json'));
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase Admin: using serviceAccountKey.json file');
    }
    
    admin.initializeApp({
      credential: credential,
    });
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }
}

const db = admin.firestore();
const authAdmin = admin.auth();

module.exports = { admin, db, authAdmin };
