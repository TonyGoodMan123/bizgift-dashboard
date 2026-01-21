import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UserProfile {
    uid: string;
    email: string;
    role: 'super-admin' | 'admin' | 'manager';
    displayName: string;
}

interface DemoUser {
    uid: string;
    email: string;
}

interface AuthContextType {
    user: DemoUser | null;
    profile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: false,
    logout: async () => { }
});

export const useAuth = () => useContext(AuthContext);

// Demo profiles for quick testing
const DEMO_PROFILES: Record<string, UserProfile> = {
    'super-admin': {
        uid: 'demo-super-admin',
        email: 'scorcioner@gmail.com',
        role: 'super-admin',
        displayName: 'Антон Федотов (Demo)'
    },
    'admin': {
        uid: 'demo-admin',
        email: 'vegapro.mcc@gmail.com',
        role: 'admin',
        displayName: 'Антон Маркелов (Demo)'
    },
    'manager': {
        uid: 'demo-manager',
        email: 'koledova49@gmail.com',
        role: 'manager',
        displayName: 'Ксения Коледова (Demo)'
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState<DemoUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check URL for demo role
        const demoRole = searchParams.get('role') ||
            window.location.pathname.split('/').pop();

        if (demoRole && DEMO_PROFILES[demoRole]) {
            const demoProfile = DEMO_PROFILES[demoRole];
            setUser({
                uid: demoProfile.uid,
                email: demoProfile.email
            });
            setProfile(demoProfile);
        } else {
            // No demo mode - set default to super-admin for testing
            const defaultProfile = DEMO_PROFILES['super-admin'];
            setUser({
                uid: defaultProfile.uid,
                email: defaultProfile.email
            });
            setProfile(defaultProfile);
        }

        setLoading(false);
    }, [searchParams]);

    const logout = async () => {
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
