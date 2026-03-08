import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export const AdminProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isLoading) {
        return <div className="min-h-screen pt-20 flex items-center justify-center bg-[#0f172a] text-white">Loading...</div>;
    }

    // Only allow if logged in and the email is the specific admin email or has admin role
    const validAdmins = ['admin@gmail.com', 'hashlinairah@gmail.com'];
    const role = user?.user_metadata?.role;
    
    if (user && (validAdmins.includes(user.email) || role === 'admin')) {
        return children;
    }

    return <Navigate to="/" replace />;
};
