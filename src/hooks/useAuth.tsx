import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signUpEmail: (email: string, pass: string) => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchRole: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAILS = ['jaideep@assimilate.one', 'jaideep@medvarsity.com'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, email: string | null, photoURL: string | null, displayName: string | null) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      let currentProfile: any;
      if (userDoc.exists()) {
        currentProfile = userDoc.data();
        let needsUpdate = false;
        const updates: any = {};

        // 1. Ensure roles array exists
        if (!currentProfile.roles) {
          currentProfile.roles = [currentProfile.role || 'audience'];
          updates.roles = currentProfile.roles;
          needsUpdate = true;
        }

        // 2. Auto-promote super-admins to have 'internal' role
        if (email && SUPER_ADMIN_EMAILS.includes(email) && !currentProfile.roles.includes('internal')) {
          currentProfile.roles = [...currentProfile.roles, 'internal'];
          updates.roles = currentProfile.roles;
          needsUpdate = true;
        }

        // 3. Ensure active role is valid (exists in roles array)
        if (!currentProfile.role || !currentProfile.roles.includes(currentProfile.role)) {
          currentProfile.role = currentProfile.roles[0];
          updates.role = currentProfile.role;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await updateDoc(doc(db, 'users', uid), updates);
        }
      } else {
        const initialRole = (email && SUPER_ADMIN_EMAILS.includes(email)) ? 'internal' : 'audience';
        currentProfile = {
          uid,
          email,
          displayName: displayName || email?.split('@')[0] || 'User',
          photoURL,
          roles: [initialRole],
          role: initialRole,
          onboardingCompleted: false,
          stats: {
            creditPoints: 0,
            sessionsWatched: 0,
            hypePoints: 0
          },
          specialties: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', uid), currentProfile);
      }
      setProfile(currentProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    console.log("Auth visibility: Initializing onAuthStateChanged");
    
    // Safety timeout for the entire auth initialization
    const globalTimeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Global auth initialization timeout reached");
        setLoading(false);
      }
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state change detected:", user ? "User logged in" : "No user");
      setUser(user);
      
      if (user) {
        // Use a Promise.race to ensure profile fetching doesn't block the app indefinitely
        const profilePromise = fetchProfile(user.uid, user.email, user.photoURL, user.displayName);
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn("Profile fetch timed out after 10 seconds");
            resolve(null);
          }, 10000);
        });

        try {
          await Promise.race([profilePromise, timeoutPromise]);
        } catch (err) {
          console.error("Profile fetch error:", err);
        }
      } else {
        setProfile(null);
      }
      
      console.log("Setting app loading to false");
      clearTimeout(globalTimeoutId);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(globalTimeoutId);
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, user.email, user.photoURL, user.displayName);
    }
  };

  const switchRole = async (selectedRole: string) => {
    if (!user || !profile) return;

    const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
    const hasRole = profile.roles?.includes(selectedRole);

    if (isSuperAdmin || hasRole) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { role: selectedRole });
        setProfile((prev: any) => ({ ...prev, role: selectedRole }));
      } catch (error) {
        console.error("Error switching role:", error);
      }
    } else {
      console.warn("User does not have permission to switch to role:", selectedRole);
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Check if we are inside an iframe.
    // If inside an iframe (like AI Studio preview), use popup.
    // If on the hosted site (top level), use redirect to avoid popup-closed issues.
    try {
      if (window.self !== window.top) {
        await signInWithPopup(auth, provider);
      } else {
        // Fallback to signInWithPopup for now since redirect often fails on certain domains without full config
        await signInWithPopup(auth, provider);
      }
    } catch (e: any) {
      console.error("Popup failed:", e);
      throw e;
    }
  };

  const signUpEmail = async (email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
  };

  const signInEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, signIn, signUpEmail, signInEmail, logout, refreshProfile, switchRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
