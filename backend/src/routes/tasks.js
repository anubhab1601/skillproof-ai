/**
 * Task Routes — Phase 2
 * POST /api/tasks/create
 * POST /api/tasks/:id/publish
 * POST /api/tasks/:id/join
 */
const express = require('express');
const router = express.Router();
const { db, admin } = require('../lib/firebase-admin');
const { verifyToken, requireRole } = require('../middleware/auth');

const MIN_PRIZE = parseInt(process.env.MIN_PRIZE_POOL_PAISE || '100'); // 100 paise = ₹1 in dev
const COMPANY_FEE = parseInt(process.env.PLATFORM_COMPANY_FEE_PERCENT || '5');
const IS_DEV = (process.env.NODE_ENV || 'development') === 'development';

/**
 * POST /api/tasks/create
 * Company creates a new task (draft status)
 */
router.post('/create', verifyToken, requireRole('company'), async (req, res) => {
  try {
    const { uid } = req.user;
    const {
      title, description, deliverables, constraints, taskType,
      skillTags, requiredSkills, difficulty, assetURLs, rubric, aiCompanySplit,
      prizePool, deadline, isFeatured, maxCandidates, payoutDistribution, domain,
      devMode,
    } = req.body;

    // Validate required fields
    if (!title || !description || !taskType || !difficulty || !prizePool || !deadline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (prizePool < MIN_PRIZE) {
      return res.status(400).json({ error: `Minimum prize pool is ₹${MIN_PRIZE / 100}` });
    }

    // Normalize rubric — accept object {name: weight} or array [{name, weight}]
    let rubricArray = [];
    if (rubric && typeof rubric === 'object' && !Array.isArray(rubric)) {
      // Object format from frontend: { "Code Quality": 30, ... }
      rubricArray = Object.entries(rubric).map(([name, weight]) => ({ name, weight }));
    } else if (Array.isArray(rubric)) {
      rubricArray = rubric;
    }

    if (rubricArray.length > 0) {
      const totalWeight = rubricArray.reduce((sum, r) => sum + (r.weight || 0), 0);
      if (totalWeight !== 100) {
        return res.status(400).json({ error: 'Rubric weights must sum to 100' });
      }
    }

    // Convert rubric to object format for Firestore storage: { "criteriaName": weight }
    const rubricObj = rubricArray.reduce((acc, r) => ({ ...acc, [r.name]: r.weight }), {});

    // Get company profile for denormalized fields
    const companyProfileDoc = await db.collection('users').doc(uid).collection('companyProfile').doc('profile').get();
    const companyData = companyProfileDoc.exists ? companyProfileDoc.data() : {};

    const now = admin.firestore.FieldValue.serverTimestamp();
    const platformFee = Math.ceil(prizePool * (COMPANY_FEE / 100));
    const totalDeposited = prizePool + platformFee;

    const taskRef = db.collection('tasks').doc();
    const taskDoc = {
      taskId: taskRef.id,
      companyUid: uid,
      companyName: companyData.companyName || '',
      companyLogoURL: companyData.companyLogoURL || null,
      isCompanyVerified: companyData.isVerified || false,
      title: title.substring(0, 100),
      description,
      deliverables: deliverables || [],
      constraints: constraints || null,
      taskType,
      skillTags: skillTags || requiredSkills || [],
      difficulty,
      assetURLs: assetURLs || [],
      rubric: rubricObj,
      aiCompanySplit: aiCompanySplit || { ai: 50, company: 50 },
      prizePool,
      platformFee,
      totalDeposited,
      minPayoutFloor: 0, // calculated after publishing
      currency: 'INR',
      status: (devMode && IS_DEV) ? 'live' : 'draft',
      escrowTransactionId: (devMode && IS_DEV) ? 'DEV_MODE_BYPASS' : null,
      escrowConfirmedAt: (devMode && IS_DEV) ? now : null,
      deadline: admin.firestore.Timestamp.fromDate(new Date(deadline)),
      reviewDeadline: null,
      createdAt: now,
      updatedAt: now,
      totalSubmissions: 0,
      qualifyingSubmissions: 0,
      isFeatured: isFeatured || false,
      cancelReason: null,
      maxCandidates: maxCandidates || null,
      payoutDistribution: payoutDistribution || 'winner_takes_all',
      domain: domain || taskType,
    };

    await taskRef.set(taskDoc);

    return res.status(201).json({ message: 'Task created as draft', taskId: taskRef.id });
  } catch (err) {
    console.error('Error creating task:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks/:id/publish
 * Verifies escrow payment, sets task live
 */
router.post('/:id/publish', verifyToken, requireRole('company'), async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const taskRef = db.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
    const task = taskDoc.data();

    if (task.companyUid !== uid) return res.status(403).json({ error: 'Not your task' });
    if (task.status !== 'draft' && task.status !== 'pending_escrow') {
      return res.status(400).json({ error: 'Task cannot be published in current status' });
    }

    // TODO: Verify Razorpay signature using razorpay SDK
    // const Razorpay = require('razorpay');
    // const isValid = Razorpay.validateWebhookSignature(...)

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Update task status to live
    batch.update(taskRef, {
      status: 'live',
      escrowTransactionId: razorpayPaymentId || null,
      escrowConfirmedAt: now,
      updatedAt: now,
    });

    // Create escrow account
    const escrowRef = db.collection('escrowAccounts').doc(id);
    batch.set(escrowRef, {
      taskId: id,
      companyUid: uid,
      prizePoolPaise: task.prizePool,
      platformFeePaise: task.platformFee,
      totalDepositedPaise: task.totalDeposited,
      status: 'held',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || null,
      depositedAt: now,
      releasedAt: null,
      totalReleasedPaise: 0,
      createdAt: now,
    });

    // Update platform stats
    batch.set(db.collection('platformStats').doc('global'), {
      totalTasksPosted: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    return res.json({ message: 'Task published and live', taskId: id });
  } catch (err) {
    console.error('Error publishing task:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks/:id/join
 * Candidate joins a task
 */
router.post('/:id/join', verifyToken, requireRole('candidate'), async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const taskDoc = await db.collection('tasks').doc(id).get();
    if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
    const task = taskDoc.data();

    if (task.status !== 'live') {
      return res.status(400).json({ error: 'Task is not open for submissions' });
    }

    // Check if already joined
    const activeTaskDoc = await db.collection('users').doc(uid).collection('activeTasks').doc(id).get();
    if (activeTaskDoc.exists) {
      return res.status(409).json({ error: 'Already joined this task' });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('users').doc(uid).collection('activeTasks').doc(id).set({
      taskId: id,
      taskTitle: task.title,
      joinedAt: now,
      submissionId: null,
      status: 'in_progress',
      deadline: task.deadline,
    });

    // Notify company
    await db.collection('notifications').add({
      notificationId: '',
      recipientUid: task.companyUid,
      type: 'candidate_joined',
      title: 'New participant',
      body: `A candidate joined your task "${task.title}"`,
      deepLink: `/company/tasks/${id}/live`,
      isRead: false,
      createdAt: now,
      readAt: null,
    });

    return res.json({ message: 'Joined task successfully', taskId: id });
  } catch (err) {
    console.error('Error joining task:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
