/**
 * Payment Routes — Phase 4
 * POST /api/payments/create-escrow-order
 * POST /api/payments/verify-escrow
 * POST /api/wallet/withdraw
 */
const express = require('express');
const router = express.Router();
const { db, admin } = require('../lib/firebase-admin');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * POST /api/payments/create-escrow-order
 * Creates Razorpay order for task escrow deposit
 */
router.post('/create-escrow-order', verifyToken, requireRole('company'), async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId, amount } = req.body;

    if (!taskId || !amount) return res.status(400).json({ error: 'taskId and amount required' });

    // TODO: Create Razorpay order
    // const Razorpay = require('razorpay');
    // const instance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    // const order = await instance.orders.create({ amount, currency: 'INR', receipt: taskId });

    // For now return mock order
    const orderId = `order_${Date.now()}`;
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('escrowAccounts').doc(taskId).set({
      taskId,
      companyUid: uid,
      prizePoolPaise: amount,
      platformFeePaise: Math.ceil(amount * 0.05),
      totalDepositedPaise: amount + Math.ceil(amount * 0.05),
      status: 'pending',
      razorpayOrderId: orderId,
      razorpayPaymentId: null,
      depositedAt: null,
      releasedAt: null,
      totalReleasedPaise: 0,
      createdAt: now,
    });

    return res.json({ orderId, amount, currency: 'INR', taskId });
  } catch (err) {
    console.error('Error creating escrow order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/payments/verify-escrow
 * Verifies Razorpay payment and activates task
 */
router.post('/verify-escrow', verifyToken, requireRole('company'), async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, taskId } = req.body;

    // TODO: Verify Razorpay signature
    // const crypto = require('crypto');
    // const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    // hmac.update(razorpayOrderId + '|' + razorpayPaymentId);
    // const expectedSig = hmac.digest('hex');
    // if (expectedSig !== razorpaySignature) throw new Error('Invalid signature');

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    batch.update(db.collection('escrowAccounts').doc(taskId), {
      status: 'held',
      razorpayPaymentId,
      depositedAt: now,
    });

    batch.update(db.collection('tasks').doc(taskId), {
      status: 'live',
      escrowTransactionId: razorpayPaymentId,
      escrowConfirmedAt: now,
      updatedAt: now,
    });

    await batch.commit();
    return res.json({ message: 'Escrow verified, task is now live' });
  } catch (err) {
    console.error('Error verifying escrow:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/wallet/withdraw
 * Candidate initiates withdrawal
 */
router.post('/withdraw', verifyToken, requireRole('candidate'), async (req, res) => {
  try {
    const { uid } = req.user;
    const { amountPaise, upiId } = req.body;

    if (!amountPaise || !upiId) return res.status(400).json({ error: 'amount and upiId required' });

    const walletDoc = await db.collection('users').doc(uid).collection('wallet').doc('balance').get();
    if (!walletDoc.exists) return res.status(404).json({ error: 'Wallet not found' });

    const wallet = walletDoc.data();
    if (wallet.availablePaise < amountPaise) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Deduct from wallet
    batch.update(db.collection('users').doc(uid).collection('wallet').doc('balance'), {
      availablePaise: admin.firestore.FieldValue.increment(-amountPaise),
      totalWithdrawnPaise: admin.firestore.FieldValue.increment(amountPaise),
      updatedAt: now,
    });

    // Create transaction
    batch.set(db.collection('users').doc(uid).collection('transactions').doc(), {
      transactionId: '',
      type: 'withdrawal_initiated',
      taskId: null,
      taskTitle: null,
      grossAmountPaise: amountPaise,
      feeAmountPaise: 0,
      netAmountPaise: amountPaise,
      status: 'processing',
      razorpayTransactionId: null,
      upiId,
      createdAt: now,
      completedAt: null,
      failureReason: null,
    });

    await batch.commit();

    // TODO: Initiate Razorpay payout
    // const Razorpay = require('razorpay');
    // ...

    return res.json({ message: 'Withdrawal initiated', amount: amountPaise });
  } catch (err) {
    console.error('Error processing withdrawal:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
