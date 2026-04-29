/**
 * Firebase Admin SDK initialization
 * Uses serviceAccountKey.json for full Firestore + Auth access
 */
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '..', '..', 'serviceAccountKey.json'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin: initialized with service account key');
}

const db = admin.firestore();
const authAdmin = admin.auth();

module.exports = { admin, db, authAdmin };
