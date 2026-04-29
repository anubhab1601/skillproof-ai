/**
 * Offers Routes — Phase 5
 * POST /api/offers/:id/accept
 */
const express = require('express');
const router = express.Router();
const { db, admin } = require('../lib/firebase-admin');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/offers/:id/accept
 * Candidate accepts a job offer — shares contact info
 */
router.post('/:id/accept', verifyToken, requireRole('candidate'), async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const offerRef = db.collection('jobOffers').doc(id);
    const offerDoc = await offerRef.get();

    if (!offerDoc.exists) return res.status(404).json({ error: 'Offer not found' });
    const offer = offerDoc.data();

    if (offer.candidateUid !== uid) return res.status(403).json({ error: 'Not your offer' });
    if (offer.status !== 'pending') return res.status(400).json({ error: 'Offer is no longer pending' });

    // Fetch both profiles for contact sharing
    const [candidateDoc, companyDoc] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(offer.companyUid).get(),
    ]);

    const candidateData = candidateDoc.data() || {};
    const companyData = companyDoc.data() || {};

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Update offer with shared contacts
    batch.update(offerRef, {
      status: 'accepted',
      contactShared: true,
      companyContactEmail: companyData.email || null,
      companyContactPhone: companyData.phone || null,
      candidateContactEmail: candidateData.email || null,
      candidateContactPhone: candidateData.phone || null,
      updatedAt: now,
    });

    // Notify company
    batch.set(db.collection('notifications').doc(), {
      notificationId: '',
      recipientUid: offer.companyUid,
      type: 'offer_accepted',
      title: 'Offer accepted!',
      body: `${candidateData.displayName || 'A candidate'} accepted your "${offer.roleTitle}" offer`,
      deepLink: `/company/offers`,
      isRead: false,
      createdAt: now,
      readAt: null,
    });

    // Notify candidate
    batch.set(db.collection('notifications').doc(), {
      notificationId: '',
      recipientUid: uid,
      type: 'offer_accepted',
      title: 'Offer accepted',
      body: `You accepted the "${offer.roleTitle}" offer from ${offer.companyName}. Contact details shared.`,
      deepLink: `/offers`,
      isRead: false,
      createdAt: now,
      readAt: null,
    });

    await batch.commit();

    return res.json({ message: 'Offer accepted, contacts shared' });
  } catch (err) {
    console.error('Error accepting offer:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
