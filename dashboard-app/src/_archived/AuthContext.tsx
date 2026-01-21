import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { ADMIN_EMAILS } from '../config/users.config';

interface UserProfile {
    uid: string;
    email: string | null;
    role: 'super-admin' | 'admin' | 'manager';
    displayName: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, logout: async () => { } });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                // Fetch user profile from Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setProfile(userDoc.data() as UserProfile);
                } else if (user.email && user.email in ADMIN_EMAILS) {
                    // Auto-provision specified administrators
                    const adminStub = ADMIN_EMAILS[user.email as keyof typeof ADMIN_EMAILS];
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email,
                        role: adminStub.role as any,
                        displayName: adminStub.name
                    };

                    // CRITICAL FIX: Save profile to Firestore so it's visible in Admin Panel
                    try {
                        await setDoc(doc(db, 'users', user.uid), {
                            ...newProfile,
                            createdAt: serverTimestamp()
                        });
                        console.log('Auto-provisioned admin profile saved to Firestore:', user.email);
                    } catch (error) {
                        console.error('Failed to save auto-provisioned profile:', error);
                    }

                    setProfile(newProfile);
                } else {
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
