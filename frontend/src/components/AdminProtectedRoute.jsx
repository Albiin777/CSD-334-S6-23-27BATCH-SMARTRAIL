import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../utils/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { AUTHORIZED_ADMINS } from '../utils/roles.config';

export const AdminProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                try {
                    const profileDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
                    if (profileDoc.exists()) {
                        setUserRole(profileDoc.data().role || 'user');
                    }
                } catch (error) {
                    console.error("Error fetching admin role:", error);
                    setUserRole('user');
                }
            } else {
                setUserRole(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <div className="min-h-screen pt-20 flex items-center justify-center bg-[#0f172a] text-white">Loading...</div>;
    }

    // Only allow if logged in and the email is in the centralized config or has admin role
    const emailLower = user?.email?.toLowerCase();
    
    if (user && (AUTHORIZED_ADMINS.includes(emailLower) || userRole === 'admin')) {
        return children;
    }


    return <Navigate to="/" replace />;
};
