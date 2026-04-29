'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const ADMIN_UID = 'crNoGP1j7RXy5xGraa92PJNFwU43';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = useCallback(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        return profile;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  // Refresh profile from Firestore (e.g. after onboarding update)
  const refreshProfile = async () => {
    if (user?.uid) {
      return await fetchUserProfile(user.uid);
    }
    return null;
  };

  const isAdmin = user?.uid === ADMIN_UID || userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

