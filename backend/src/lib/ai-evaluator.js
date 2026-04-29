/**
 * AI Evaluation Service — Uses Gemma 4 via OpenRouter
 * Evaluates submissions against task rubrics
 */
const axios = require('axios');
const { db, admin } = require('./firebase-admin');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Max characters to send to AI (free models have ~8k context)
const MAX_CODE_CHARS = 6000;
const MAX_WRITEUP_CHARS = 2000;
const REQUEST_TIMEOUT_MS = 90000; // 90 seconds (free models can be slow)

// Retry config for 429 rate limits
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 15000; // 15 seconds base delay for 429s

/**
 * Truncate text to maxLen characters with an indicator
 */
function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  return text.substring(0, maxLen) + '\n\n... [TRUNCATED — original was ' + text.length + ' chars]';
}

/**
 * Normalize rubric: handles both array and object formats
 * Input:  { "Code Quality": 50, "Performance": 25 }  or  [{ criterionName: "...", weight: 50 }]
 * Output: [{ criterionName: "Code Quality", weight: 50, description: "Code Quality" }, ...]
 */
function normalizeRubric(rubric) {
  if (!rubric) return [];

  // Already an array
  if (Array.isArray(rubric)) {
    return rubric.map(r => ({
      criterionName: r.criterionName || r.name || r.criterion || 'Criterion',
      weight: r.weight || 25,
      description: r.description || r.criterionName || r.name || 'No description',
    }));
  }

  // Object format: { "Code Quality": 50, ... }
  if (typeof rubric === 'object') {
    return Object.entries(rubric).map(([name, weight]) => ({
      criterionName: name,
      weight: typeof weight === 'number' ? weight : parseInt(weight) || 25,
      description: name,
    }));
  }

  return [];
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call OpenRouter with retry logic for 429 rate limits
 */
async function callOpenRouterWithRetry(requestBody, headers) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] OpenRouter attempt ${attempt}/${MAX_RETRIES}...`);

      const response = await axios.post(OPENROUTER_URL, requestBody, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      });

      console.log(`[AI] OpenRouter response status: ${response.status}`);
      console.log(`[AI] OpenRouter model used: ${response.data?.model || 'unknown'}`);

      // Check for API-level errors in the response body
      if (response.data?.error) {
        const errMsg = typeof response.data.error === 'string'
          ? response.data.error
          : JSON.stringify(response.data.error);
        throw new Error(`OpenRouter API error: ${errMsg}`);
      }

      return response;

    } catch (err) {
      const is429 = err.response?.status === 429;
      const is503 = err.response?.status === 503;
      const isRetryable = is429 || is503;

      if (isRetryable && attempt < MAX_RETRIES) {
        // Check for Retry-After header
        const retryAfter = err.response?.headers?.['retry-after'];
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_DELAY_MS * attempt; // exponential-ish backoff

        console.log(`[AI] Rate limited (${err.response?.status}). Waiting ${Math.round(waitMs / 1000)}s before retry...`);
        await sleep(waitMs);
        continue;
      }

      // Not retryable or out of retries — throw
      throw err;
    }
  }
}

/**
 * Evaluate a submission using Gemma 4
 * @param {string} submissionId - Firestore submission document ID
 * @param {array|object} rubric - Task rubric criteria (array or object)
 * @param {string} writeup - Candidate's writeup
 * @param {array} codeFiles - Array of code file objects
 */
async function evaluateSubmission(submissionId, rubric, writeup, codeFiles) {
  const subRef = db.collection('submissions').doc(submissionId);

  console.log(`[AI] ─── Starting evaluation for ${submissionId} ───`);
  console.log(`[AI]   API Key present: ${!!process.env.OPENROUTER_API_KEY}`);
  console.log(`[AI]   Model: ${process.env.AI_MODEL || 'google/gemma-3-27b-it:free'}`);
  console.log(`[AI]   Rubric type: ${typeof rubric}, isArray: ${Array.isArray(rubric)}`);
  console.log(`[AI]   Writeup length: ${writeup?.length || 0}`);
  console.log(`[AI]   Code files: ${Array.isArray(codeFiles) ? codeFiles.length : 0}`);

  try {
    // Mark as processing
    await subRef.update({
      'aiEvaluation.status': 'processing',
      'aiEvaluation.errorMessage': null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Validate API key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not set in environment variables');
    }

    // Normalize rubric (handles both array and object formats)
    const rubricArray = normalizeRubric(rubric);
    console.log(`[AI]   Normalized rubric: ${rubricArray.length} criteria`);

    // Build the evaluation prompt
    const rubricText = rubricArray.length > 0
      ? rubricArray.map(r =>
          `- ${r.criterionName} (max ${r.weight} points out of 100): ${r.description}`
        ).join('\n')
      : '- Code Quality (max 30 points): Overall code quality, readability, and best practices\n- Correctness (max 30 points): Does the solution correctly solve the problem?\n- Completeness (max 20 points): Are all requirements addressed?\n- Documentation (max 20 points): Comments, writeup, and explanation quality';

    // Build code text with truncation
    let codeText = '[No code files submitted]';
    if (codeFiles && codeFiles.length > 0) {
      const nonEmptyFiles = codeFiles.filter(f => f.content && f.content.trim().length > 0);
      if (nonEmptyFiles.length > 0) {
        const perFileLimit = Math.floor(MAX_CODE_CHARS / nonEmptyFiles.length);
        codeText = nonEmptyFiles.map(f => {
          const content = truncate(f.content, perFileLimit);
          return `\n--- ${f.fileName || f.name || 'file'} (${f.language || 'unknown'}) ---\n${content}`;
        }).join('\n');
      } else {
        codeText = '[Code files were submitted but content is empty]';
      }
    }

    const writeupText = truncate(writeup, MAX_WRITEUP_CHARS) || '[No writeup provided]';

    const prompt = `You are an expert technical evaluator for a performance marketplace platform called SkillProof. 
Evaluate the following submission against the rubric criteria below.

IMPORTANT SCORING RULE: Each criterion has a MAXIMUM SCORE equal to its weight. Do NOT score out of 100.
For example, if "Code Quality" has max 30 points, score it from 0 to 30.
The total score is the SUM of all criterion scores (out of 100).

RUBRIC:
${rubricText}

CANDIDATE WRITEUP:
${writeupText}

CODE FILES:
${codeText}

INSTRUCTIONS:
1. Score each criterion from 0 to its MAX POINTS (not 0-100). E.g. if max is 25, score 0-25.
2. Provide specific, constructive feedback for each criterion.
3. Check for potential integrity issues (plagiarism indicators, unusually low effort, copy-paste from well-known sources).
4. totalScore = sum of all criterion scores (should be 0-100).

Respond ONLY in this exact JSON format (no markdown, no backticks):
{
  "criterionScores": [
    { "criterionName": "<name>", "maxScore": <max points for this criterion>, "score": <0 to maxScore>, "feedback": "<2-3 sentence feedback>" }
  ],
  "totalScore": <sum of all scores, 0-100>,
  "integrityFlag": <true/false>,
  "integrityFlagReason": "<reason or null>",
  "summary": "<1 paragraph overall assessment>"
}`;

    console.log(`[AI] Prompt length: ${prompt.length} chars`);

    const requestBody = {
      model: process.env.AI_MODEL || 'google/gemma-3-27b-it:free',
      messages: [
        { role: 'system', content: 'You are a precise technical evaluator. Always respond with valid JSON only. No markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    };

    const headers = {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://skillproof.ai',
      'X-Title': 'SkillProof AI Evaluator',
    };

    // Call with retry logic for 429s
    const response = await callOpenRouterWithRetry(requestBody, headers);

    const aiContent = response.data?.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error('[AI] Empty response data:', JSON.stringify(response.data).substring(0, 500));
      throw new Error('Empty AI response — no content in choices[0].message.content');
    }

    console.log(`[AI] Response content length: ${aiContent.length} chars`);
    console.log(`[AI] Response preview: ${aiContent.substring(0, 300)}...`);

    // Parse JSON from response (handle possible markdown wrapping)
    let parsed;
    try {
      let jsonStr = aiContent.trim();
      // Strip markdown code fences if present
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[AI] JSON parse error:', parseErr.message);
      console.error('[AI] Raw AI content:', aiContent.substring(0, 1000));
      
      // Try to extract JSON from the response using regex
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log('[AI] Successfully extracted JSON via regex fallback');
        } catch {
          throw new Error('Failed to parse AI evaluation response even with regex fallback');
        }
      } else {
        throw new Error('Failed to parse AI evaluation response — no JSON found');
      }
    }

    // Validate and normalize parsed response
    if (!Array.isArray(parsed.criterionScores)) {
      parsed.criterionScores = [];
    }

    // Ensure each criterion has maxScore from rubric
    parsed.criterionScores = parsed.criterionScores.map(cs => {
      const rubricMatch = rubricArray.find(r => r.criterionName === cs.criterionName);
      const maxScore = cs.maxScore || rubricMatch?.weight || 25;
      const score = Math.min(Math.max(0, cs.score || 0), maxScore); // clamp to 0..maxScore
      return { ...cs, maxScore, score };
    });

    // Recalculate totalScore as sum of criterion scores
    const calculatedTotal = parsed.criterionScores.reduce((sum, cs) => sum + (cs.score || 0), 0);
    parsed.totalScore = Math.round(calculatedTotal);
    console.log(`[AI] Criterion scores: ${parsed.criterionScores.map(c => `${c.criterionName}: ${c.score}/${c.maxScore}`).join(', ')}`);
    console.log(`[AI] Total score: ${parsed.totalScore}/100`);

    // Write evaluation back to Firestore
    await subRef.update({
      'aiEvaluation.status': 'complete',
      'aiEvaluation.processedAt': admin.firestore.FieldValue.serverTimestamp(),
      'aiEvaluation.totalScore': parsed.totalScore || 0,
      'aiEvaluation.criterionScores': parsed.criterionScores || [],
      'aiEvaluation.integrityFlag': parsed.integrityFlag || false,
      'aiEvaluation.integrityFlagReason': parsed.integrityFlagReason || null,
      'aiEvaluation.summary': parsed.summary || '',
      'aiEvaluation.errorMessage': null,
      finalScore: parsed.totalScore || 0,
      qualificationStatus: (parsed.totalScore || 0) >= parseInt(process.env.QUALIFICATION_THRESHOLD || '75') ? 'qualified' : 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[AI] ✓ Firestore updated for ${submissionId}`);

    // Send notification to candidate
    const subData = (await subRef.get()).data();
    if (subData?.candidateUid) {
      await db.collection('notifications').add({
        notificationId: '',
        recipientUid: subData.candidateUid,
        type: 'ai_evaluation_complete',
        title: 'AI evaluation complete',
        body: `Your submission for "${subData.taskTitle || 'Task'}" scored ${Math.round(parsed.totalScore || 0)}/100`,
        deepLink: `/submissions/${submissionId}/result`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null,
      });
    }

    console.log(`[AI] ✓ Evaluated submission ${submissionId} — Score: ${parsed.totalScore}`);
    return parsed;

  } catch (err) {
    // Enhanced error logging
    let errorMsg = err.message || 'Unknown error';

    if (err.response) {
      // OpenRouter returned an error response
      console.error(`[AI] ✗ OpenRouter HTTP ${err.response.status} for ${submissionId}:`);
      console.error(`[AI]   Response:`, JSON.stringify(err.response.data).substring(0, 500));
      errorMsg = `OpenRouter ${err.response.status}: ${JSON.stringify(err.response.data?.error || err.response.data).substring(0, 200)}`;
    } else if (err.code === 'ECONNABORTED') {
      console.error(`[AI] ✗ Request timeout (${REQUEST_TIMEOUT_MS}ms) for ${submissionId}`);
      errorMsg = `Request timeout after ${REQUEST_TIMEOUT_MS / 1000}s`;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.error(`[AI] ✗ Network error for ${submissionId}: ${err.code}`);
      errorMsg = `Network error: ${err.code}`;
    } else {
      console.error(`[AI] ✗ Evaluation failed for ${submissionId}:`, err.message);
    }

    // Mark as failed with the error message
    try {
      await subRef.update({
        'aiEvaluation.status': 'failed',
        'aiEvaluation.errorMessage': errorMsg,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateErr) {
      console.error('[AI] Failed to update submission status:', updateErr.message);
    }

    return null;
  }
}

module.exports = { evaluateSubmission };
