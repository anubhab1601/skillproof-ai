/**
 * Cron Jobs — Phase 7
 * - Every 5 min: check task deadlines
 * - Every 1 hour: send deadline reminders (24h warning)
 * - Every 24 hours: expire pending job offers
 */
const cron = require('node-cron');
const { db, admin } = require('../lib/firebase-admin');

function startCronJobs() {
  console.log('[CRON] Registering scheduled jobs...');

  // ─── Every 5 minutes: check task deadlines ───────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const snapshot = await db.collection('tasks')
        .where('status', '==', 'live')
        .where('deadline', '<=', admin.firestore.Timestamp.fromDate(now))
        .get();

      if (snapshot.empty) return;
      console.log(`[CRON] Found ${snapshot.size} tasks past deadline`);

      const batch = db.batch();
      const serverNow = admin.firestore.FieldValue.serverTimestamp();
      const reviewDeadline = admin.firestore.Timestamp.fromDate(
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      );

      snapshot.forEach(doc => {
        const task = doc.data();

        // Transition task to under_review
        batch.update(doc.ref, {
          status: 'under_review',
          reviewDeadline,
          updatedAt: serverNow,
        });

        // Notify company
        batch.set(db.collection('notifications').doc(), {
          notificationId: '',
          recipientUid: task.companyUid,
          type: 'task_closed',
          title: 'Task deadline reached',
          body: `"${task.title}" is now closed for submissions. Review within 7 days.`,
          deepLink: `/company/tasks/${doc.id}/review`,
          isRead: false,
          createdAt: serverNow,
          readAt: null,
        });
      });

      await batch.commit();
      console.log(`[CRON] Transitioned ${snapshot.size} tasks to under_review`);
    } catch (err) {
      console.error('[CRON] Task deadline check error:', err);
    }
  });

  // ─── Every hour: deadline reminders (24h warning) ───────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const snapshot = await db.collection('tasks')
        .where('status', '==', 'live')
        .where('deadline', '>', admin.firestore.Timestamp.fromDate(now))
        .where('deadline', '<=', admin.firestore.Timestamp.fromDate(in24h))
        .get();

      if (snapshot.empty) return;
      console.log(`[CRON] Found ${snapshot.size} tasks with 24h deadline warning`);

      for (const taskDoc of snapshot.docs) {
        const task = taskDoc.data();

        // Find candidates with in_progress status
        const activeTasksSnap = await db.collectionGroup('activeTasks')
          .where('taskId', '==', taskDoc.id)
          .where('status', '==', 'in_progress')
          .get();

        const batch = db.batch();
        const serverNow = admin.firestore.FieldValue.serverTimestamp();

        activeTasksSnap.forEach(atDoc => {
          // Extract uid from path: users/{uid}/activeTasks/{taskId}
          const candidateUid = atDoc.ref.parent.parent.id;

          batch.set(db.collection('notifications').doc(), {
            notificationId: '',
            recipientUid: candidateUid,
            type: 'deadline_reminder',
            title: 'Deadline approaching!',
            body: `"${task.title}" closes in less than 24 hours. Submit your work now.`,
            deepLink: `/tasks/${taskDoc.id}`,
            isRead: false,
            createdAt: serverNow,
            readAt: null,
          });
        });

        if (!activeTasksSnap.empty) {
          await batch.commit();
          console.log(`[CRON] Sent ${activeTasksSnap.size} deadline reminders for "${task.title}"`);
        }
      }
    } catch (err) {
      console.error('[CRON] Deadline reminder error:', err);
    }
  });

  // ─── Every 24 hours: expire job offers ──────────────────────
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date();
      const snapshot = await db.collection('jobOffers')
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(now))
        .get();

      if (snapshot.empty) return;
      console.log(`[CRON] Found ${snapshot.size} expired offers`);

      const batch = db.batch();
      const serverNow = admin.firestore.FieldValue.serverTimestamp();

      snapshot.forEach(doc => {
        const offer = doc.data();

        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: serverNow,
        });

        // Notify company
        batch.set(db.collection('notifications').doc(), {
          notificationId: '',
          recipientUid: offer.companyUid,
          type: 'offer_expired',
          title: 'Offer expired',
          body: `Your "${offer.roleTitle}" offer has expired without a response.`,
          deepLink: `/company/offers`,
          isRead: false,
          createdAt: serverNow,
          readAt: null,
        });
      });

      await batch.commit();
      console.log(`[CRON] Expired ${snapshot.size} offers`);
    } catch (err) {
      console.error('[CRON] Offer expiry error:', err);
    }
  });

  // ─── Every 10 minutes: retry failed/stuck AI evaluations ────
  cron.schedule('*/10 * * * *', async () => {
    try {
      // Find submissions with failed or stuck (processing > 10 min) AI evaluations
      const failedSnap = await db.collection('submissions')
        .where('aiEvaluation.status', '==', 'failed')
        .limit(10)
        .get();

      const now = new Date();
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const stuckSnap = await db.collection('submissions')
        .where('aiEvaluation.status', '==', 'processing')
        .where('updatedAt', '<', admin.firestore.Timestamp.fromDate(tenMinAgo))
        .limit(5)
        .get();

      const toRetry = [...failedSnap.docs, ...stuckSnap.docs];
      if (toRetry.length === 0) return;

      console.log(`[CRON] Found ${toRetry.length} submissions needing AI evaluation retry`);

      const { evaluateSubmission } = require('../lib/ai-evaluator');

      for (const subDoc of toRetry) {
        const sub = subDoc.data();
        try {
          // Fetch the task rubric
          const taskDoc = await db.collection('tasks').doc(sub.taskId).get();
          const rubric = taskDoc.exists ? taskDoc.data().rubric : [];

          console.log(`[CRON] Retrying AI evaluation for ${subDoc.id}...`);
          await evaluateSubmission(subDoc.id, rubric, sub.writeup, sub.codeFiles);
        } catch (evalErr) {
          console.error(`[CRON] AI retry failed for ${subDoc.id}:`, evalErr.message);
        }

        // Small delay between retries to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.error('[CRON] AI evaluation retry error:', err);
    }
  });

  // ─── Every 30 minutes: auto-close tasks with 0 submissions past deadline ──
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      const snapshot = await db.collection('tasks')
        .where('status', '==', 'under_review')
        .where('deadline', '<', admin.firestore.Timestamp.fromDate(twoDaysAgo))
        .get();

      if (snapshot.empty) return;

      const batch = db.batch();
      const serverNow = admin.firestore.FieldValue.serverTimestamp();
      let closedCount = 0;

      for (const taskDoc of snapshot.docs) {
        const task = taskDoc.data();
        const subsSnap = await db.collection('submissions')
          .where('taskId', '==', taskDoc.id)
          .limit(1)
          .get();

        if (subsSnap.empty) {
          // No submissions — auto-complete with refund
          batch.update(taskDoc.ref, {
            status: 'completed',
            qualifyingSubmissions: 0,
            updatedAt: serverNow,
          });

          batch.set(db.collection('notifications').doc(), {
            notificationId: '',
            recipientUid: task.companyUid,
            type: 'task_no_submissions',
            title: 'Task closed — no submissions',
            body: `"${task.title}" received no submissions. Escrow refund initiated.`,
            deepLink: `/company/tasks/${taskDoc.id}/live`,
            isRead: false,
            createdAt: serverNow,
            readAt: null,
          });

          closedCount++;
        }
      }

      if (closedCount > 0) {
        await batch.commit();
        console.log(`[CRON] Auto-closed ${closedCount} tasks with no submissions`);
      }
    } catch (err) {
      console.error('[CRON] Auto-close tasks error:', err);
    }
  });

  console.log('[CRON] All jobs registered ✓');
}

module.exports = { startCronJobs };
