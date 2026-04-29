/**
 * Auth middleware — verifies Firebase ID token from Authorization header
 * Attaches decoded user to req.user
 */
const { authAdmin, db } = require('../lib/firebase-admin');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await authAdmin.verifyIdToken(idToken);
    req.user = decoded;

    // Fetch role from Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (userDoc.exists) {
      req.userRole = (userDoc.data().role || '').toLowerCase();
    }

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const normalizedRoles = roles.map(r => r.toLowerCase());
    if (!req.userRole || !normalizedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.userRole || 'none'}`,
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
