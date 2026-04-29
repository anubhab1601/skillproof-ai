/**
 * Auth Routes — Phase 1
 * POST /api/auth/create-profile
 */
const express = require('express');
const router = express.Router();
const { db, admin } = require('../lib/firebase-admin');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/auth/create-profile
 * Called by frontend after Firebase Auth signup
 * Creates users/{uid} document + wallet/balance document
 */
router.post('/create-profile', verifyToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { email, phone, displayName, role } = req.body;

    // Validate role
    if (!['candidate', 'company'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be candidate or company.' });
    }

    // Check if user document already exists
    const existingDoc = await db.collection('users').doc(uid).get();
    if (existingDoc.exists) {
      return res.status(409).json({ error: 'User profile already exists.' });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Create user document
    const userDoc = {
      uid,
      email: email || '',
      phone: phone || '',
      displayName: displayName || '',
      role,
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
      photoURL: null,
      city: null,
      isActive: true,
      isBanned: false,
    };

    const batch = db.batch();

    // 1. Create users/{uid}
    batch.set(db.collection('users').doc(uid), userDoc);

    // 2. Create wallet/balance subcollection doc
    batch.set(db.collection('users').doc(uid).collection('wallet').doc('balance'), {
      totalEarnedPaise: 0,
      pendingPaise: 0,
      availablePaise: 0,
      totalFeePaidPaise: 0,
      totalWithdrawnPaise: 0,
      updatedAt: now,
    });

    // 3. Create role-specific subcollection
    if (role === 'candidate') {
      batch.set(db.collection('users').doc(uid).collection('candidateProfile').doc('profile'), {
        domain: '',
        experienceLevel: '',
        skillTags: [],
        bio: '',
        githubURL: null,
        linkedinURL: null,
        portfolioURL: null,
        resumeURL: null,
        isPublic: true,
        publicUsername: '',
        skillScore: 0,
        peiLevel: 'bronze',
        domainScores: { coding: 0, design: 0, data: 0, writing: 0, marketing: 0, finance: 0 },
        totalTasksCompleted: 0,
        totalEarned: 0,
        verifiedSubmissionsCount: 0,
      });
    } else if (role === 'company') {
      batch.set(db.collection('users').doc(uid).collection('companyProfile').doc('profile'), {
        companyName: '',
        companyLogoURL: null,
        description: '',
        industry: '',
        teamSize: '',
        website: null,
        gstOrPan: null,
        hiringDomains: [],
        razorpayAccountId: null,
        escrowBalance: 0,
        totalSpent: 0,
        isVerified: false,
        rating: 0,
      });
    }

    await batch.commit();

    // Update platform stats
    const statsRef = db.collection('platformStats').doc('global');
    const field = role === 'candidate' ? 'totalCandidates' : 'totalCompanies';
    await statsRef.set(
      { [field]: admin.firestore.FieldValue.increment(1), updatedAt: now },
      { merge: true }
    );

    return res.status(201).json({ message: 'Profile created successfully', uid, role });
  } catch (err) {
    console.error('Error creating profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/check-email
 * Check if an email is already registered
 */
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    const exists = !snapshot.empty;
    const role = exists ? snapshot.docs[0].data().role : null;

    return res.json({ exists, role });
  } catch (err) {
    console.error('Error checking email:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
