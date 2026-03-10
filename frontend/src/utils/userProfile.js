/**
 * Syncs a Firebase user's profile to the Supabase `profiles` table
 * via the backend `/api/auth/sync-profile` endpoint, which uses the
 * Supabase SERVICE ROLE KEY to bypass Row Level Security (RLS).
 *
 * This is necessary because our users authenticate via Firebase,
 * not Supabase Auth, so `auth.uid()` is always null in RLS policies.
 *
 * @param {import('firebase/auth').User} firebaseUser - Firebase user object
 * @param {Object} extraData - Optional: { email, phone, full_name, dob, gender }
 */
export async function syncUserProfile(firebaseUser, extraData = {}) {
  if (!firebaseUser?.uid) return;

  try {
    const payload = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || extraData.email || null,
      phone: extraData.phone || firebaseUser.phoneNumber || null,
      full_name: extraData.full_name || firebaseUser.displayName || null,
      ...(extraData.dob ? { dob: extraData.dob } : {}),
      ...(extraData.gender ? { gender: extraData.gender } : {})
    };

    // Remove null values so we don't overwrite good data with nulls
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    const response = await fetch('http://localhost:5001/api/auth/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[syncUserProfile] Backend error:', data.error);
    }
  } catch (err) {
    console.error('[syncUserProfile] Network error:', err.message);
  }
}
