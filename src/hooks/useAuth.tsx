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
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['jaideep@assimilate.one', 'jaideep@medvarsity.com'];

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
        // Migrating role to roles if necessary
        if (!currentProfile.roles) {
          currentProfile.roles = [currentProfile.role || 'audience'];
        }
        if (email && SUPER_ADMIN_EMAILS.includes(email) && !currentProfile.roles.includes('internal')) {
          currentProfile.roles = [...currentProfile.roles, 'internal'];
          currentProfile.role = 'internal';
          await updateDoc(doc(db, 'users', uid), { roles: currentProfile.roles, role: 'internal' });
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
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchProfile(user.uid, user.email, user.photoURL, user.displayName);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, user.email, user.photoURL, user.displayName);
    }
  };

  const switchRole = (role: string) => {
    if (user?.email && SUPER_ADMIN_EMAILS.includes(user.email)) {
      setProfile((prev: any) => ({ ...prev, role }));
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
