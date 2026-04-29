/**
 * Backend API client
 * All frontend → Node.js backend communication goes through here
 * Automatically attaches Firebase ID token for auth
 */
import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Make an authenticated request to the backend
 * @param {string} path - API path (e.g. '/api/auth/create-profile')
 * @param {object} options - fetch options
 * @returns {Promise<object>} parsed JSON response
 */
async function apiRequest(path, options = {}) {
  const user = auth.currentUser;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (user) {
    const idToken = await user.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}

// ─── AUTH ──────────────────────────────────────────────────────
export async function createProfile({ email, phone, displayName, role }) {
  return apiRequest('/api/auth/create-profile', {
    method: 'POST',
    body: JSON.stringify({ email, phone, displayName, role }),
  });
}

export async function checkEmailExists(email) {
  return apiRequest('/api/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ─── TASKS ────────────────────────────────────────────────────
export async function createTask(taskData) {
  return apiRequest('/api/tasks/create', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
}

export async function publishTask(taskId, paymentData) {
  return apiRequest(`/api/tasks/${taskId}/publish`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

export async function joinTask(taskId) {
  return apiRequest(`/api/tasks/${taskId}/join`, {
    method: 'POST',
  });
}

// ─── SUBMISSIONS ──────────────────────────────────────────────
export async function createSubmission(submissionData) {
  return apiRequest('/api/submissions/create', {
    method: 'POST',
    body: JSON.stringify(submissionData),
  });
}

export async function releasePayouts(taskId) {
  return apiRequest(`/api/tasks/${taskId}/release-payouts`, {
    method: 'POST',
  });
}

// ─── PAYMENTS ─────────────────────────────────────────────────
export async function createEscrowOrder(taskId, amount) {
  return apiRequest('/api/payments/create-escrow-order', {
    method: 'POST',
    body: JSON.stringify({ taskId, amount }),
  });
}

export async function verifyEscrow(paymentData) {
  return apiRequest('/api/payments/verify-escrow', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

export async function withdrawFunds(amountPaise, upiId) {
  return apiRequest('/api/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amountPaise, upiId }),
  });
}

// ─── OFFERS ───────────────────────────────────────────────────
export async function acceptOffer(offerId) {
  return apiRequest(`/api/offers/${offerId}/accept`, {
    method: 'POST',
  });
}

// ─── CLOUDINARY ───────────────────────────────────────────────
export async function getUploadSignature(folder, resourceType = 'auto') {
  return apiRequest('/api/cloudinary/sign-upload', {
    method: 'POST',
    body: JSON.stringify({ folder, resourceType }),
  });
}

/**
 * Upload a file directly to Cloudinary using signed params
 * @param {File} file - The file to upload
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<object>} Cloudinary response with url, public_id etc.
 */
export async function uploadToCloudinary(file, folder) {
  const { signature, timestamp, cloudName, apiKey } = await getUploadSignature(folder);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Cloudinary upload failed');
  return res.json();
}

export default apiRequest;
