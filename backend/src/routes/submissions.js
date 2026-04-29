/**
 * Submission Routes — Phase 3
 * POST /api/submissions/create
 * POST /api/tasks/:id/release-payouts
 */
const express = require('express');
const router = express.Router();
const { db, admin } = require('../lib/firebase-admin');
const { verifyToken, requireRole } = require('../middleware/auth');
const { evaluateSubmission } = require('../lib/ai-evaluator');

const QUALIFICATION_THRESHOLD = parseInt(process.env.QUALIFICATION_THRESHOLD || '75');
const CANDIDATE_FEE = parseInt(process.env.PLATFORM_CANDIDATE_FEE_PERCENT || '3');

/**
 * POST /api/submissions/create
 * Candidate submits work for a task
 */
router.post('/create', verifyToken, requireRole('candidate'), async (req, res) => {
  try {
    const { uid } = req.user;
    const { taskId, codeFiles, uploadedFiles, writeup, integrityMeta } = req.body;

    if (!taskId) return res.status(400).json({ error: 'taskId required' });

    // Verify task exists and is live
    const taskDoc = await db.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
    const task = taskDoc.data();

    if (task.status !== 'live') {
      return res.status(400).json({ error: 'Task is not accepting submissions' });
    }

    // Check deadline (handle both Firestore Timestamp and JS Date)
    try {
      const deadlineDate = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
        return res.status(400).json({ error: 'Task deadline has passed' });
      }
    } catch (e) {
      console.warn('[Submissions] Could not parse deadline, skipping check:', e.message);
    }

    // Auto-join if not already joined (creates activeTasks doc on the fly)
    const activeTaskRef = db.collection('users').doc(uid).collection('activeTasks').doc(taskId);
    const activeTaskDoc = await activeTaskRef.get();
    if (activeTaskDoc.exists && activeTaskDoc.data().status === 'submitted') {
      return res.status(400).json({ error: 'You have already submitted for this task' });
    }
    if (!activeTaskDoc.exists) {
      await activeTaskRef.set({
        taskId,
        taskTitle: task.title,
        companyUid: task.companyUid,
        companyName: task.companyName || '',
        status: 'in_progress',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const submissionRef = db.collection('submissions').doc();

    const submissionDoc = {
      submissionId: submissionRef.id,
      taskId,
      candidateUid: uid,
      taskTitle: task.title,
      companyUid: task.companyUid,
      companyName: task.companyName,
      taskType: task.taskType,
      codeFiles: codeFiles || [],
      uploadedFiles: uploadedFiles || [],
      writeup: writeup || '',
      integrityMeta: {
        timeOnTaskSeconds: integrityMeta?.timeOnTaskSeconds || 0,
        editCount: integrityMeta?.editCount || 0,
        pasteEventCount: integrityMeta?.pasteEventCount || 0,
        focusLossCount: integrityMeta?.focusLossCount || 0,
        isVerified: false,
        submittedAt: now,
      },
      aiEvaluation: {
        status: 'pending',
        processedAt: null,
        totalScore: null,
        criterionScores: [],
        integrityFlag: false,
        integrityFlagReason: null,
      },
      companyEvaluation: {
        status: 'pending',
        reviewedAt: null,
        criterionScores: [],
        internalNotes: null,
        isShortlisted: false,
      },
      finalScore: null,
      isQualified: null,
      qualificationStatus: 'pending',
      rank: null,
      percentile: null,
      payoutAmount: null,
      payoutStatus: 'not_eligible',
      payoutTransactionId: null,
      payoutCreditedAt: null,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();

    // 1. Create submission
    batch.set(submissionRef, submissionDoc);

    // 2. Update activeTask status
    batch.update(db.collection('users').doc(uid).collection('activeTasks').doc(taskId), {
      submissionId: submissionRef.id,
      status: 'submitted',
    });

    // 3. Increment task totalSubmissions
    batch.update(db.collection('tasks').doc(taskId), {
      totalSubmissions: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    });

    // 4. Notify company
    batch.set(db.collection('notifications').doc(), {
      notificationId: '',
      recipientUid: task.companyUid,
      type: 'new_submission',
      title: 'New submission received',
      body: `A candidate submitted for "${task.title}"`,
      deepLink: `/company/tasks/${taskId}/review`,
      isRead: false,
      createdAt: now,
      readAt: null,
    });

    await batch.commit();

    // Trigger AI evaluation asynchronously (non-blocking)
    evaluateSubmission(submissionRef.id, task.rubric, writeup, codeFiles)
      .then(() => console.log(`[AI] Evaluation queued for ${submissionRef.id}`))
      .catch(err => console.error(`[AI] Evaluation queue error:`, err.message));

    return res.status(201).json({ message: 'Submission created', submissionId: submissionRef.id });
  } catch (err) {
    console.error('Error creating submission:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks/:id/release-payouts
 * Company triggers final scoring and payout distribution
 */
router.post('/tasks/:id/release-payouts', verifyToken, requireRole('company'), async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const taskDoc = await db.collection('tasks').doc(id).get();
    if (!taskDoc.exists) return res.status(404).json({ error: 'Task not found' });
    const task = taskDoc.data();

    if (task.companyUid !== uid) return res.status(403).json({ error: 'Not your task' });
    if (task.status !== 'under_review') {
      return res.status(400).json({ error: 'Task must be under review to release payouts' });
    }

    // Fetch all submissions for this task
    const subsSnap = await db.collection('submissions').where('taskId', '==', id).get();
    if (subsSnap.empty) {
      return res.status(400).json({ error: 'No submissions found' });
    }

    const aiWeight = task.aiCompanySplit?.ai || 50;
    const companyWeight = task.aiCompanySplit?.company || 50;
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Calculate blended scores
    const scoredSubmissions = [];
    subsSnap.forEach(doc => {
      const sub = doc.data();
      const aiScore = sub.aiEvaluation?.totalScore || 0;
      const companyScore = sub.companyEvaluation?.criterionScores?.reduce(
        (sum, c) => sum + (c.score || 0), 0
      ) / (sub.companyEvaluation?.criterionScores?.length || 1) || 0;

      const blendedScore = (aiScore * aiWeight + companyScore * companyWeight) / 100;
      const isQualified = blendedScore >= QUALIFICATION_THRESHOLD;

      scoredSubmissions.push({
        ref: doc.ref,
        candidateUid: sub.candidateUid,
        finalScore: Math.round(blendedScore * 100) / 100,
        isQualified,
      });
    });

    // Sort by score descending
    scoredSubmissions.sort((a, b) => b.finalScore - a.finalScore);

    // Calculate payouts proportionally
    const qualified = scoredSubmissions.filter(s => s.isQualified);
    const totalQualifiedScore = qualified.reduce((sum, s) => sum + s.finalScore, 0);

    const batch = db.batch();
    let totalReleased = 0;

    for (let i = 0; i < scoredSubmissions.length; i++) {
      const sub = scoredSubmissions[i];
      let payoutAmount = 0;
      let payoutStatus = 'not_eligible';

      if (sub.isQualified && totalQualifiedScore > 0) {
        const share = sub.finalScore / totalQualifiedScore;
        payoutAmount = Math.floor(task.prizePool * share);
        const fee = Math.ceil(payoutAmount * (CANDIDATE_FEE / 100));
        payoutAmount -= fee;
        payoutStatus = 'pending';
        totalReleased += payoutAmount + fee;

        // Credit candidate wallet
        const walletRef = db.collection('users').doc(sub.candidateUid).collection('wallet').doc('balance');
        batch.update(walletRef, {
          totalEarnedPaise: admin.firestore.FieldValue.increment(payoutAmount),
          availablePaise: admin.firestore.FieldValue.increment(payoutAmount),
          totalFeePaidPaise: admin.firestore.FieldValue.increment(fee),
          updatedAt: now,
        });

        // Create transaction record
        batch.set(db.collection('users').doc(sub.candidateUid).collection('transactions').doc(), {
          transactionId: '',
          type: 'payout_credited',
          taskId: id,
          taskTitle: task.title,
          grossAmountPaise: payoutAmount + fee,
          feeAmountPaise: fee,
          netAmountPaise: payoutAmount,
          status: 'complete',
          razorpayTransactionId: null,
          upiId: null,
          createdAt: now,
          completedAt: now,
          failureReason: null,
        });

        // Notify candidate
        batch.set(db.collection('notifications').doc(), {
          notificationId: '',
          recipientUid: sub.candidateUid,
          type: 'payout_credited',
          title: 'Payout received!',
          body: `₹${(payoutAmount / 100).toFixed(0)} credited for "${task.title}"`,
          deepLink: '/wallet',
          isRead: false,
          createdAt: now,
          readAt: null,
        });

        // Update candidate stats
        const profileRef = db.collection('users').doc(sub.candidateUid).collection('candidateProfile').doc('profile');
        batch.update(profileRef, {
          totalTasksCompleted: admin.firestore.FieldValue.increment(1),
          totalEarned: admin.firestore.FieldValue.increment(payoutAmount),
          verifiedSubmissionsCount: admin.firestore.FieldValue.increment(1),
        });
      }

      // Update submission
      batch.update(sub.ref, {
        finalScore: sub.finalScore,
        isQualified: sub.isQualified,
        qualificationStatus: sub.isQualified ? 'qualified' : 'disqualified',
        rank: i + 1,
        percentile: Math.round(((scoredSubmissions.length - i) / scoredSubmissions.length) * 100),
        payoutAmount: payoutAmount || 0,
        payoutStatus,
        updatedAt: now,
      });
    }

    // Update task to completed
    batch.update(db.collection('tasks').doc(id), {
      status: 'completed',
      qualifyingSubmissions: qualified.length,
      updatedAt: now,
    });

    // Update escrow
    batch.update(db.collection('escrowAccounts').doc(id), {
      status: 'released',
      releasedAt: now,
      totalReleasedPaise: totalReleased,
    });

    // Update platform stats
    batch.set(db.collection('platformStats').doc('global'), {
      totalTasksCompleted: admin.firestore.FieldValue.increment(1),
      totalPrizeMoneyCreditedPaise: admin.firestore.FieldValue.increment(totalReleased),
      totalSubmissions: admin.firestore.FieldValue.increment(scoredSubmissions.length),
      updatedAt: now,
    }, { merge: true });

    await batch.commit();

    return res.json({
      message: 'Payouts released',
      totalSubmissions: scoredSubmissions.length,
      qualifiedCount: qualified.length,
      totalReleased,
    });
  } catch (err) {
    console.error('Error releasing payouts:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/submissions/:id/retry-evaluation
 * Manually retrigger AI evaluation for a submission
 */
router.post('/:id/retry-evaluation', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    const subDoc = await db.collection('submissions').doc(id).get();
    if (!subDoc.exists) return res.status(404).json({ error: 'Submission not found' });
    const sub = subDoc.data();

    // Only the task's company or the candidate can retry
    if (sub.candidateUid !== uid && sub.companyUid !== uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Only retry if failed or pending
    const aiStatus = sub.aiEvaluation?.status;
    if (aiStatus === 'complete') {
      return res.status(400).json({ error: 'AI evaluation already complete' });
    }

    // Fetch task rubric
    const taskDoc = await db.collection('tasks').doc(sub.taskId).get();
    let rubric = [];
    if (taskDoc.exists) {
      const taskData = taskDoc.data();
      if (Array.isArray(taskData.rubric)) {
        rubric = taskData.rubric;
      } else if (taskData.rubric && typeof taskData.rubric === 'object') {
        // Convert {CriterionName: weight, ...} to [{criterionName, weight}, ...]
        rubric = Object.entries(taskData.rubric).map(([name, weight]) => ({
          criterionName: name,
          weight: typeof weight === 'number' ? weight : parseInt(weight) || 25,
          description: name,
        }));
      }
    }

    // Trigger async (non-blocking)
    evaluateSubmission(id, rubric, sub.writeup, sub.codeFiles)
      .then(() => console.log(`[AI] Manual retry evaluation queued for ${id}`))
      .catch(err => console.error(`[AI] Manual retry error:`, err.message));

    return res.json({ message: 'AI evaluation retriggered', submissionId: id });
  } catch (err) {
    console.error('Error retriggering evaluation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id/evaluation-status
 * Check AI evaluation status for a submission
 */
router.get('/:id/evaluation-status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subDoc = await db.collection('submissions').doc(id).get();
    if (!subDoc.exists) return res.status(404).json({ error: 'Submission not found' });

    const sub = subDoc.data();
    const { uid } = req.user;

    // Only the task's company or the candidate can view
    if (sub.candidateUid !== uid && sub.companyUid !== uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    return res.json({
      submissionId: id,
      aiEvaluation: sub.aiEvaluation,
      finalScore: sub.finalScore,
      qualificationStatus: sub.qualificationStatus,
    });
  } catch (err) {
    console.error('Error fetching evaluation status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
