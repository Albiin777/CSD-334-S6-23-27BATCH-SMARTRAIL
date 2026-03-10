import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../utils/firebaseClient';
import { getDoc, doc } from 'firebase/firestore';
import { syncUserProfile } from '../utils/userProfile';
import { onAuthStateChanged, updateEmail, verifyBeforeUpdateEmail, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, updatePhoneNumber, signInWithCustomToken } from 'firebase/auth';
import { User, Mail, Phone, ShieldCheck, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

export default function MyAccount() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info'); // info, success, error
    
    // Editing states
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    
    const [otp, setOtp] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const loadUserData = async (currentUser) => {
            if (!currentUser || !mounted) return;
            
            // Fetch extra profile data (like phone) from Supabase, since Firebase email/password users
            // don't have phoneNumber set in Firebase Auth - it's stored in our Supabase users table.
            let phone = currentUser.phoneNumber || '';
            let fullName = currentUser.displayName || currentUser.email?.split('@')[0];
            let email = currentUser.email || '';
            try {
                const profileDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
                if (profileDoc.exists()) {
                    const profileData = profileDoc.data();
                    phone = profileData.phone || phone;
                    fullName = profileData.full_name || fullName;
                    email = profileData.email || email;
                }
            } catch (err) {
                console.warn('[MyAccount] Could not load profile from Firestore:', err);
            }
            
            if (!mounted) return;
            setUser({
                id: currentUser.uid,
                email: email,
                phone,
                name: fullName,
                provider: currentUser.providerData?.[0]?.providerId || 'mobile'
            });
            setNewEmail(email || '');
            setNewPhone(phone || '+91');
        };

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                loadUserData(currentUser);
                if (mounted) setIsLoading(false);
            } else if (mounted) {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    // Timer logic for resend cooldown
    useEffect(() => {
        if (resendCooldown > 0) {
            timerRef.current = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [resendCooldown]);

    const startResendCooldown = () => setResendCooldown(30);

    const handleUpdateEmail = async (e) => {
        if (e) e.preventDefault();

        const trimmedEmail = newEmail.toLowerCase().trim();
        if (trimmedEmail === user?.email?.toLowerCase().trim()) {
            setIsEditingEmail(false);
            setMessage("You are already using this email address.");
            setMessageType('error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setMessage("Please enter a valid email address.");
            setMessageType('error');
            return;
        }

        setMessage('');
        setIsProcessing(true);
        try {
            // Send OTP to the NEW email using our custom backend
            const response = await fetch(`${API_BASE_URL}/auth/send-custom-email-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmedEmail })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to send OTP");

            setIsVerifyingEmail(true);
            setMessageType('info');
            setMessage(`A 6-digit code has been sent to ${trimmedEmail}. Enter it below.`);
        } catch (error) {
            setMessageType('error');
            setMessage(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePhone = async (e) => {
        if (e) e.preventDefault();
        
        let formattedPhone = newPhone.trim();
        if (!formattedPhone.startsWith('+91') && formattedPhone !== '') {
            formattedPhone = '+91' + formattedPhone.replace(/^\+/, '');
        }

        // Check if the user entered the same phone number
        if (formattedPhone === user?.phone || newPhone.trim() === user?.phone) {
            setIsEditingPhone(false);
            setMessage("You are already using this phone number.");
            setMessageType('error');
            return;
        }

        setMessage('');
        setMessageType('info');
        setIsProcessing(true);
        try {
            if (!window.accountRecaptchaVerifier) {
                window.accountRecaptchaVerifier = new RecaptchaVerifier(auth, 'account-recaptcha-verifier', { 'size': 'invisible' });
            }
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.accountRecaptchaVerifier);
            window._accountPhoneConfirmation = confirmationResult;
            setIsVerifyingPhone(true);
            setMessage("OTP sent to " + formattedPhone);
            startResendCooldown();
        } catch (error) {
            setMessageType('error');
            setMessage(error.message);
            if (window.accountRecaptchaVerifier) {
                window.accountRecaptchaVerifier.clear();
                window.accountRecaptchaVerifier = null;
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerify = async (type) => {
        setMessage('');
        setMessageType('info');
        setIsProcessing(true);
        try {
            if (type === 'email') {
                const trimmedEmail = newEmail.toLowerCase().trim();
                const currentUser = auth.currentUser;
                if (!currentUser) throw new Error('Not authenticated.');

                const response = await fetch(`${API_BASE_URL}/auth/verify-custom-email-update-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: trimmedEmail, token: otp, uid: currentUser.uid })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to verify OTP');

                // Re-authenticate with the fresh custom token so the session stays alive
                // (Firebase revokes existing tokens when email changes via Admin SDK)
                if (data.customToken) {
                    await signInWithCustomToken(auth, data.customToken);
                }

                // Update local state
                setUser({ ...user, email: trimmedEmail });
                setIsVerifyingEmail(false);
                setIsEditingEmail(false);

            } else if (type === 'phone') {
                const confirmation = window._accountPhoneConfirmation;
                if (!confirmation) throw new Error('OTP session expired. Please resend.');
                
                const currentUser = auth.currentUser;
                if (!currentUser) throw new Error('Not authenticated.');
                const phoneCredential = PhoneAuthProvider.credential(confirmation.verificationId, otp);
                
                let firebaseLinked = false;
                try {
                    await updatePhoneNumber(currentUser, phoneCredential);
                    firebaseLinked = true;
                } catch (fbError) {
                    if (fbError.code === 'auth/credential-already-in-use') {
                        // Phone already belongs to another Firebase account.
                        // We'll still save it in Supabase profiles for contact/display purposes.
                        console.warn('[MyAccount] Phone already linked to another account, saving to profile only.');
                    } else {
                        throw fbError; // Re-throw unexpected errors
                    }
                }

                // Always sync phone to Firestore profiles regardless of Firebase linking
                await syncUserProfile(currentUser, { phone: newPhone });
                setUser({ ...user, phone: newPhone });
                setIsEditingPhone(false);
                setIsVerifyingPhone(false);
                window._accountPhoneConfirmation = null;

                if (!firebaseLinked) {
                    setMessageType('info');
                    setMessage(`Phone number saved to your profile. Note: this number may be used as a login method by another account.`);
                    setOtp('');
                    setIsProcessing(false);
                    return;
                }
            }
            setMessageType('success');
            setMessage(`${type === 'email' ? 'Email' : 'Phone'} updated successfully.`);
            setOtp('');
        } catch (error) {
            setMessageType('error');
            if (error.code === 'auth/invalid-verification-code') {
                setMessage('The OTP code is incorrect or has expired. Please try again.');
            } else if (error.code === 'auth/requires-recent-login') {
                setMessage('For security, please sign out and sign back in before changing your phone number.');
            } else {
                setMessage(error.message);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 bg-gray-900 text-white font-sans flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-gray-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Account Details...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 bg-gray-900 text-white font-sans flex items-center justify-center">
                <div className="p-8 rounded-2xl border border-slate-800 text-center max-w-sm">
                    <ShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                    <p className="text-gray-500 mb-6">Please sign in to manage your account details.</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-36 pb-20 px-4 sm:px-8 bg-gray-900 text-white font-sans">

            {/* Hidden div for Firebase RecaptchaVerifier (used for phone number update) */}
            <div id="account-recaptcha-verifier" style={{ display: 'none' }}></div>
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Account Settings</h1>
                        <p className="text-gray-500 font-medium">Manage your personal data and security preferences.</p>
                    </div>
                </div>

                {message && (
                    <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                        messageType === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' :
                        messageType === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-100' :
                        'bg-slate-800/50 border-slate-700 text-gray-300'
                    }`}>
                        {messageType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 flex-shrink-0" />}
                        <span className="text-sm font-medium">{message}</span>
                    </div>
                )}

                <div className="grid gap-6">
                    <div className="bg-transparent rounded-xl border border-slate-800 overflow-hidden">
                        <div className="p-6 sm:p-10 space-y-8">
                            {/* Full Name Row */}
                            <div className="flex items-start gap-6">
                                <User className="w-6 h-6 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-1">Full Name</h3>
                                    <div className="text-xl font-bold text-white leading-tight flex flex-wrap items-center gap-3">
                                        {user.name}
                                        {user.provider === 'google' && (
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold uppercase tracking-widest">Google Account</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 font-medium">Used for identification and ticket bookings.</p>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800/50 w-full"></div>

                            {/* Email Row */}
                            <div className="flex items-start gap-6">
                                <Mail className="w-6 h-6 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-1">Email Address</h3>
                                    {!isEditingEmail ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <span className="text-base sm:text-lg font-medium text-gray-200 leading-tight break-all">
                                                {user.email}
                                            </span>
                                            <button
                                                onClick={() => setIsEditingEmail(true)}
                                                className="w-full sm:w-auto px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-xs uppercase tracking-widest transition shrink-0"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-4">
                                            {!isVerifyingEmail ? (
                                                <form onSubmit={handleUpdateEmail} className="flex flex-col sm:flex-row gap-3">
                                                    <input
                                                        type="email"
                                                        value={newEmail}
                                                        onChange={(e) => setNewEmail(e.target.value)}
                                                        className="flex-1 bg-transparent border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-slate-500 text-white transition"
                                                        placeholder="Enter new email"
                                                        required
                                                    />
                                                    <div className="flex gap-2">
                                                        <button type="submit" disabled={isProcessing} className="flex-1 px-6 py-2.5 bg-white text-black rounded-lg font-bold text-xs uppercase transition disabled:opacity-50">
                                                            {isProcessing ? 'Sending...' : 'Update'}
                                                        </button>
                                                        <button type="button" onClick={() => setIsEditingEmail(false)} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-bold text-xs uppercase transition">Cancel</button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="animate-in slide-in-from-right-4">
                                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                                        <input
                                                            type="text"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value)}
                                                            placeholder="6-digit OTP"
                                                            className="w-full sm:w-40 bg-transparent border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-slate-500 text-white transition text-center font-bold"
                                                            maxLength={6}
                                                        />
                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                            <button 
                                                                onClick={() => handleVerify('email')}
                                                                disabled={isProcessing || otp.length < 6}
                                                                className="flex-1 sm:flex-none px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold text-xs uppercase transition disabled:opacity-50"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleUpdateEmail()}
                                                                disabled={isProcessing || resendCooldown > 0}
                                                                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 text-gray-400 hover:text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition disabled:opacity-50"
                                                            >
                                                                <RotateCcw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                                                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-slate-800/50 w-full"></div>

                            {/* Phone Row */}
                            <div className="flex items-start gap-6">
                                <Phone className="w-6 h-6 text-gray-500 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-1">Phone Number</h3>
                                    {!isEditingPhone ? (
                                        <div className="space-y-3">
                                            <p className="text-xs text-gray-500 font-medium">
                                                {user.phone ? "Your primary contact for ticket updates and mobile login." : "Link your mobile number for seamless login and instant PNR updates."}
                                            </p>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <span className="text-base sm:text-lg font-medium text-gray-200 leading-tight">
                                                    {user.phone || 'Not linked'}
                                                </span>
                                                <button
                                                    onClick={() => setIsEditingPhone(true)}
                                                    className={`w-full sm:w-auto px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition shrink-0 ${
                                                        !user.phone ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-white text-black hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {user.phone ? 'Change' : 'Link Phone'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-4">
                                            {!isVerifyingPhone ? (
                                                <form onSubmit={handleUpdatePhone} className="flex flex-col sm:flex-row gap-3">
                                                    <input
                                                        type="tel"
                                                        value={newPhone}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (!val.startsWith('+')) val = '+' + val;
                                                            setNewPhone(val);
                                                        }}
                                                        className="flex-1 bg-transparent border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-slate-500 text-white transition"
                                                        placeholder="+91 00000 00000"
                                                        required
                                                    />
                                                    <div className="flex gap-2">
                                                        <button type="submit" disabled={isProcessing} className="flex-1 px-6 py-2.5 bg-white text-black rounded-lg font-bold text-xs uppercase transition disabled:opacity-50">
                                                            {isProcessing ? 'Sending...' : 'Save'}
                                                        </button>
                                                        <button type="button" onClick={() => setIsEditingPhone(false)} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-bold text-xs uppercase transition">Cancel</button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="animate-in slide-in-from-right-4">
                                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                                        <input
                                                            type="text"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value)}
                                                            placeholder="OTP"
                                                            className="w-full sm:w-32 bg-transparent border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-slate-500 text-white transition text-center font-bold"
                                                            maxLength={6}
                                                        />
                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                            <button 
                                                                onClick={() => handleVerify('phone')}
                                                                disabled={isProcessing || otp.length < 6}
                                                                className="flex-1 sm:flex-none px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold text-xs uppercase transition disabled:opacity-50"
                                                            >
                                                                Verify
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleUpdatePhone()}
                                                                disabled={isProcessing || resendCooldown > 0}
                                                                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 text-gray-400 hover:text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition disabled:opacity-50"
                                                            >
                                                                <RotateCcw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                                                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 px-8 py-4 flex items-center justify-between border-t border-slate-800/50">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Secure Account Management</span>
                            <div className="flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border border-slate-800 rounded-xl flex items-center gap-4">
                        <ShieldCheck className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            Verification codes are sent to ensure your security. Never share these codes with anyone.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
