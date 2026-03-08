import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User, Mail, Phone, ShieldCheck, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';

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
        const fetchUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUser({
                        id: user.id,
                        email: user.email,
                        phone: user.phone || '',
                        name: user.user_metadata?.full_name || user.email?.split('@')[0]
                    });
                    setNewEmail(user.email);
                    setNewPhone(user.phone || '+91');
                }
            } catch (err) {
                console.error("Error fetching user details", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
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
        setMessage('');
        setMessageType('info');
        setIsProcessing(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            setIsVerifyingEmail(true);
            setMessage("Verification required. Enter the OTP sent to your new email.");
            startResendCooldown();
        } catch (error) {
            setMessageType('error');
            setMessage(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePhone = async (e) => {
        if (e) e.preventDefault();
        setMessage('');
        setMessageType('info');
        setIsProcessing(true);
        
        let formattedPhone = newPhone;
        if (!formattedPhone.startsWith('+91')) {
            formattedPhone = '+91' + formattedPhone.replace(/^\+/, '');
        }

        try {
            const { error } = await supabase.auth.updateUser({ phone: formattedPhone });
            if (error) throw error;
            setIsVerifyingPhone(true);
            setMessage("Verification OTP sent to " + formattedPhone);
            startResendCooldown();
        } catch (error) {
            setMessageType('error');
            setMessage(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerify = async (type) => {
        setMessage('');
        setMessageType('info');
        setIsProcessing(true);
        try {
            const verifyParams = {
                token: otp,
                type: type === 'email' ? 'email_change' : 'phone_change',
            };
            
            if (type === 'email') verifyParams.email = newEmail;
            else verifyParams.phone = newPhone;

            const { error } = await supabase.auth.verifyOtp(verifyParams);
            if (error) throw error;

            setMessageType('success');
            setMessage(`${type === 'email' ? 'Email' : 'Phone'} updated successfully.`);
            
            if (type === 'email') {
                setUser({ ...user, email: newEmail });
                setIsEditingEmail(false);
                setIsVerifyingEmail(false);
            } else {
                setUser({ ...user, phone: newPhone });
                setIsEditingPhone(false);
                setIsVerifyingPhone(false);
            }
            setOtp('');
        } catch (error) {
            setMessageType('error');
            setMessage(error.message);
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
                                    <div className="text-xl font-bold text-white leading-tight">{user.name}</div>
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
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-lg font-medium text-gray-200 leading-tight">{user.email}</span>
                                            <button
                                                onClick={() => setIsEditingEmail(true)}
                                                className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-xs uppercase tracking-widest transition"
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
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-lg font-medium text-gray-200 leading-tight">{user.phone || 'Not linked'}</span>
                                            <button
                                                onClick={() => setIsEditingPhone(true)}
                                                className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-xs uppercase tracking-widest transition"
                                            >
                                                {user.phone ? 'Change' : 'Add'}
                                            </button>
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
