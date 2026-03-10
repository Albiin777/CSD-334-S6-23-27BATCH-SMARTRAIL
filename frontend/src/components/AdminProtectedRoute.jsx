import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export const AdminProtectedRoute = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user;
            setUser(currentUser);

            if (currentUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', currentUser.id)
                    .single();
                setUserRole(profile?.role || 'user');
            }
            setIsLoading(false);
        };

        checkRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            // In a real app, we might want to re-fetch the role here too
        });

        return () => subscription.unsubscribe();
    }, []);

    const [userRole, setUserRole] = useState(null);

    if (isLoading) {
        return <div className="min-h-screen pt-20 flex items-center justify-center bg-[#0f172a] text-white">Loading...</div>;
    }

    // Only allow if logged in and the email is the specific admin email or has admin role
    const validAdmins = ['admin@gmail.com', 'hashlinairah@gmail.com'];
    
    if (user && (validAdmins.includes(user.email) || userRole === 'admin')) {
        return children;
    }


    return <Navigate to="/" replace />;
};
