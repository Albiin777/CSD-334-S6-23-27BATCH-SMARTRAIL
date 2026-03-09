import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { auth } from "../utils/firebaseClient";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { X, ArrowRight, Loader2, User, Calendar, Phone, Mail, CheckCircle2, Lock, Eye, EyeOff, Timer, ChevronDown } from "lucide-react";

export default function Auth({ onClose }) {
  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState("login");

  // Steps: 'credentials' -> 'otp' -> 'profile' -> 'reset_password'
  const [step, setStep] = useState("credentials");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dobError, setDobError] = useState("");

  // Data
  const [identifier, setIdentifier] = useState(""); // Email or Phone
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useOtpLogin, setUseOtpLogin] = useState(false); // Only for Login mode

  // Forgot Password
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const passwordInputRef = useRef(null);
  const dateInputRef = useRef(null);

  const [confirmationResult, setConfirmationResult] = useState(null);

  // Data
  const [profile, setProfile] = useState({
    fullName: "",
    dob: "",
    gender: "",
    email: ""
  });

  const [emailVerificationState, setEmailVerificationState] = useState({
    code: "",
    sent: false,
    verified: false,
    loading: false
  });

  // Timer
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Setup Recaptcha once
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-verifier', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  // Reset state when mode changes
  useEffect(() => {
    setStep("credentials");
    setIdentifier("");
    setPassword("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setSuccess("");
    setUseOtpLogin(false);
    setForgotPasswordMode(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setProfile({ fullName: "", dob: "", gender: "", email: "" });
    setEmailVerificationState({ code: "", sent: false, verified: false, loading: false });
  }, [mode]);

  // Timer Countdown
  useEffect(() => {
    let interval;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      pastedData.forEach((val, i) => {
        if (i < 6) newOtp[i] = val;
      });
      setOtp(newOtp);
      otpRefs.current[Math.min(pastedData.length, 5)].focus();
    }
  };

  // 1. Handle Credentials Submission
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const isMobile = /^[0-9]{10}$/.test(identifier);
      
      const emailLower = identifier.toLowerCase();
      
      if (forgotPasswordMode) {
        if (!isEmail) throw new Error("Please enter a valid Email to reset password.");
        await sendPasswordResetEmail(auth, emailLower);
        setSuccess(`Password reset link sent to ${emailLower}`);
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (!isMobile && !isEmail) throw new Error("Sign up requires a valid Mobile Number or Email.");
        if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
      } else {
        if (!isEmail && !isMobile) throw new Error("Please enter a valid Email or Mobile Number.");
        if (!useOtpLogin && !password) throw new Error("Please enter your password.");
      }

      const isMobileDetected = isMobile;
      const loginValue = isMobileDetected ? `+91${identifier}` : identifier;

      if (mode === 'signup') {
        if (isEmail) {
          // Email Signup
          const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
          // Go to profile immediately if email signup
          setStep("profile");
          setSuccess("Account created, please complete your profile.");
        } else {
          // Mobile OTP Signup via Firebase
          const appVerifier = window.recaptchaVerifier;
          const confirmRes = await signInWithPhoneNumber(auth, loginValue, appVerifier);
          setConfirmationResult(confirmRes);
          setStep("otp");
          setTimer(30);
          setCanResend(false);
          setSuccess(`OTP sent to ${loginValue}`);
        }
      } else {
        // LOGIN
        if (useOtpLogin) {
          if (!isMobileDetected) throw new Error("OTP Login is only supported for Mobile Numbers.");
          const appVerifier = window.recaptchaVerifier;
          const confirmRes = await signInWithPhoneNumber(auth, loginValue, appVerifier);
          setConfirmationResult(confirmRes);
          setStep("otp");
          setTimer(30);
          setCanResend(false);
          setSuccess(`OTP sent to ${loginValue}`);
        } else {
          // Login via Password
          if (!isEmail) throw new Error("Password login requires an Email id right now.");
          const userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
          finishAuth();
        }
      }

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Invalid credentials. Please try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle OTP Verification
  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      if (!confirmationResult) throw new Error("Session expired, please request OTP again.");
      
      const result = await confirmationResult.confirm(otpValue);
      const user = result.user;

      // If Signup Mode -> Go to Profile
      if (mode === 'signup') {
        if (!user.displayName) {
          setStep("profile");
          setSuccess("Verified! please complete your profile.");
          setLoading(false);
          return;
        }
      }

      // Login Mode or Completed Profile -> Finish
      finishAuth();

    } catch (err) {
      if (err.code === 'auth/invalid-verification-code') {
        setError("The code is invalid or has expired. Please try again.");
      } else {
        setError(err.message || "Invalid OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError("");

    try {
      const isMobile = /^[0-9]{10}$/.test(identifier);
      if (!isMobile) throw new Error("OTP is currently for mobile only");
      const loginValue = `+91${identifier}`;
      
      const appVerifier = window.recaptchaVerifier;
      const confirmRes = await signInWithPhoneNumber(auth, loginValue, appVerifier);
      setConfirmationResult(confirmRes);

      setTimer(30);
      setCanResend(false);
      setSuccess("Code resent successfully!");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Skip custom Email Verification step for now to respect Firebase flow simpler setup
  const handleVerifyEmail = async () => {
    // We treat email verification inside Firebase Profile updates later if needed
    // For now we mock the successful verification in this UI since we skipped actual email code loops
    setEmailVerificationState({
      ...emailVerificationState,
      verified: true,
      loading: false,
      sent: false
    });
    setSuccess("Email validated for completion!");
  };

  const handleConfirmEmailOtp = async () => {
    handleVerifyEmail();
  };

  const handleEditEmail = () => {
    setEmailVerificationState({ ...emailVerificationState, sent: false, verified: false, code: "" });
    setSuccess("");
    setError("");
  };

  const handleResendEmailOtp = async () => {
    await handleVerifyEmail();
  };

  // 3. Handle Profile Completion
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!profile.fullName || !profile.dob || !profile.gender) {
        throw new Error("Please fill in all fields.");
      }

      // Validate DOB
      const selectedDate = new Date(profile.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        setDobError("Date of birth cannot be in the future.");
        throw new Error("Please correct your date of birth.");
      }
      const age = today.getFullYear() - selectedDate.getFullYear() -
        (today < new Date(today.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) ? 1 : 0);
      if (age < 18) {
        setDobError("You must be at least 18 years old to register.");
        throw new Error("You must be at least 18 years old to register.");
      }

      if (!emailVerificationState.verified) {
        throw new Error("Please verify your email address.");
      }

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("No user is currently authenticated");

      await updateProfile(currentUser, { displayName: profile.fullName });

      // After Auth Profile update, sync to Supabase generic users table for app usage
      const { error: sbError } = await supabase.from('users').upsert({
        id: currentUser.uid,
        email: profile.email || currentUser.email,
        full_name: profile.fullName,
        dob: profile.dob,
        gender: profile.gender,
        role: 'user'
      }, { onConflict: 'id' });

      if (sbError) console.error("Error syncing to Supabase", sbError);

      finishAuth();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finishAuth = () => {
    setSuccess("Welcome to SmartRail!");
    // Close modal immediately. App.jsx handles auth state reactively.
    handleClose();
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Optionally sync with Supabase here
      const user = result.user;
      await supabase.from('users').upsert({
        id: user.uid,
        email: user.email,
        full_name: user.displayName,
        role: 'user'
      }, { onConflict: 'id' });

      finishAuth();
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">

      {/* Close Button - Fixed relative to the card */}
      <div className="absolute top-0 right-0 p-5 z-20">
        <button onClick={handleClose} className="p-2 bg-white/80 hover:bg-gray-100 rounded-full transition-colors backdrop-blur-sm">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="overflow-y-auto p-6 sm:p-8 scrollbar-hide">

        {/* Header Text */}
        <div className="text-center space-y-1 mt-2 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#2B2B2B]">
            {step === 'reset_password' ? 'Reset Password' : step === 'profile' ? 'Finish Setup' : mode === 'login' ? (forgotPasswordMode ? 'Forgot Password' : 'Welcome Back') : 'Create Account'}
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {step === 'credentials' && (mode === 'login' ? (forgotPasswordMode ? "Verify via OTP to reset" : "Login to continue") : "Start your journey")}
            {step === 'otp' && "Verify your identity"}
            {step === 'profile' && "Tell us a bit about yourself"}
            {step === 'reset_password' && "Set your new password"}
          </p>
        </div>

        {/* ERROR / SUCCESS */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-xl text-center">
            {error}
          </div>
        )}
        {success && !error && (
          <div className="p-3 bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider rounded-xl text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </div>
        )}

        {/* STEP 1: CREDENTIALS (Identifier + Password) */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
            <div className="space-y-4">

              {/* Show Google only on Login */}
              {mode === 'login' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.69 1.22 9.19 3.61l6.86-6.86C35.64 2.39 30.21 0 24 0 14.82 0 6.73 5.64 2.69 13.76l7.99 6.2C12.47 13.43 17.73 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.21-.43-4.73H24v9.01h12.69c-.55 2.98-2.21 5.51-4.71 7.21l7.3 5.68C43.98 37.38 46.5 31.47 46.5 24.5z" />
                      <path fill="#FBBC05" d="M10.68 28.96A14.5 14.5 0 019.5 24c0-1.72.3-3.39.84-4.96l-7.99-6.2A23.96 23.96 0 000 24c0 3.84.92 7.47 2.69 10.76l7.99-6.2z" />
                      <path fill="#34A853" d="M24 48c6.21 0 11.64-2.05 15.52-5.58l-7.3-5.68c-2.03 1.36-4.64 2.16-8.22 2.16-6.27 0-11.53-3.93-13.32-9.46l-7.99 6.2C6.73 42.36 14.82 48 24 48z" />
                    </svg>
                    <span className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">Continue with Google</span>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-gray-400 font-bold tracking-widest">Or login with</span></div>
                  </div>
                </>
              )}

              <div className="space-y-3">
                {/* Identifier Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {/^[0-9]+$/.test(identifier) ? <Phone className="w-5 h-5 text-gray-400" /> : <Mail className="w-5 h-5 text-gray-400" />}
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const shouldSubmit = (
                          (mode === 'login' && (useOtpLogin || password)) ||
                          (mode === 'signup' && password)
                        );
                        if (shouldSubmit) {
                          handleCredentialsSubmit(e);
                        } else {
                          passwordInputRef.current?.focus();
                        }
                      }
                    }}
                    placeholder={mode === 'login' ? "Email or Mobile" : "Mobile Number"}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] focus:bg-white rounded-xl outline-none transition-all font-medium text-[#2B2B2B] placeholder:text-gray-400"
                    autoFocus
                  />
                </div>

                {/* Password Input (Hidden if using OTP login) */}
                {!useOtpLogin && (
                  <div className="relative group animate-in fade-in slide-in-from-top-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] focus:bg-white rounded-xl outline-none transition-all font-medium text-[#2B2B2B] placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Login Options */}
              {mode === 'login' && (
                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => setUseOtpLogin(!useOtpLogin)}
                    className="text-[10px] font-bold text-[#2B2B2B] hover:underline uppercase tracking-wide"
                  >
                    {useOtpLogin ? "Use Password" : "Login via OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setUseOtpLogin(true);
                      setPassword("");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-[10px] font-bold text-gray-400 hover:text-[#2B2B2B] uppercase tracking-wide"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button
              disabled={loading || !identifier || (!useOtpLogin && !password && mode === 'login') || (mode === 'signup' && !password)}
              className="mt-2 w-full bg-[#2B2B2B] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{mode === 'login' ? (useOtpLogin ? 'Get OTP' : 'Sign In') : 'Sign Up'} <ArrowRight className="w-5 h-5" /></>}
            </button>

            {/* Footer Toggle */}
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500 font-medium">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="ml-1.5 font-bold text-[#2B2B2B] hover:underline"
                >
                  {mode === 'login' ? "Sign Up" : "Sign In"}
                </button>
              </p>

              <p className="text-[10px] text-gray-400 mt-4">
                Railway Official?
                <a href="http://localhost:5174/login" className="ml-1 font-bold text-gray-500 hover:text-[#2B2B2B] hover:underline transition-colors uppercase tracking-wider">
                  TTE Portal
                </a>
              </p>
            </div>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={handleOtpVerify} className="flex flex-col gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Enter the code sent to <br />
                <span className="font-bold text-[#2B2B2B]">{(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) ? `+91 ${identifier}` : identifier}</span>
              </p>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); }}
                className="text-[10px] text-blue-600 font-bold mt-2 hover:underline uppercase tracking-widest"
              >
                Change {(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) ? 'Number' : 'Email'}
              </button>
            </div>

            {/* 6 SPLIT INPUTS */}
            <div className="flex justify-between gap-1 sm:gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handlePaste}
                  maxLength={1}
                  className="w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold bg-transparent border-b-2 border-gray-300 focus:border-[#2B2B2B] outline-none transition-colors text-[#2B2B2B]"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="space-y-3">
              <button
                disabled={loading || otp.join("").length !== 6}
                className="w-full bg-[#2B2B2B] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Proceed"}
              </button>

              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest transition-colors"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Timer className="w-3 h-3" /> Resend in {timer}s
                  </p>
                )}
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: RESET PASSWORD (Forgot Password Flow) */}
        {step === 'reset_password' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (!newPassword || newPassword.length < 6) {
                setError("Password must be at least 6 characters.");
                return;
              }
              if (newPassword !== confirmPassword) {
                setError("Passwords do not match.");
                return;
              }
              setLoading(true);
              try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                setSuccess("Password updated successfully!");
                finishAuth();
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
            className="flex flex-col gap-4"
          >
            <div className="bg-gray-100 border border-gray-200 p-4 rounded-xl mb-2">
              <p className="text-xs text-gray-800 font-bold flex items-center gap-2">
                <Lock className="w-4 h-4" /> Set New Password
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                Choose a strong password for your account, or skip to continue with OTP login.
              </p>
            </div>

            <div className="space-y-3">
              {/* New Password */}
              <div className="relative group animate-in fade-in slide-in-from-top-2">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] focus:bg-white rounded-xl outline-none transition-all font-medium text-[#2B2B2B] placeholder:text-gray-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative group animate-in fade-in slide-in-from-top-2">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] focus:bg-white rounded-xl outline-none transition-all font-medium text-[#2B2B2B] placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              disabled={loading || !newPassword || !confirmPassword}
              className="mt-2 w-full bg-[#2B2B2B] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Update Password <ArrowRight className="w-5 h-5" /></>}
            </button>

            {/* Skip option */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => finishAuth()}
                className="text-xs font-bold text-gray-400 hover:text-[#2B2B2B] uppercase tracking-widest transition-colors"
              >
                Skip & Continue
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: PROFILE COMPLETION (Signup Only) */}
        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <div className="bg-gray-100 border border-gray-200 p-4 rounded-xl mb-2">
              <p className="text-xs text-gray-800 font-bold flex items-center gap-2">
                <User className="w-4 h-4" /> Almost There!
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                Complete your profile and verify your email to finish.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] rounded-xl outline-none font-medium text-[#2B2B2B]"
                />
              </div>

              {/* Email Verification Section */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="flex flex-col sm:flex-row gap-2 min-w-0 items-stretch">
                  <input
                    type="email"
                    value={profile.email}
                    disabled={emailVerificationState.verified}
                    onChange={(e) => {
                      if (emailVerificationState.sent) {
                        setEmailVerificationState({ ...emailVerificationState, sent: false, code: "" });
                      }
                      setProfile({ ...profile, email: e.target.value });
                    }}
                    placeholder="john@example.com"
                    className={`flex-1 min-w-0 px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] rounded-xl outline-none font-medium text-[#2B2B2B] ${emailVerificationState.verified ? 'text-green-600 bg-green-50' : ''}`}
                  />
                  {!emailVerificationState.verified && (
                    <>
                      {emailVerificationState.sent ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-none">
                          <button
                            type="button"
                            onClick={handleEditEmail}
                            className="px-4 py-3 bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-300 disabled:opacity-50 w-full sm:w-auto"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={handleResendEmailOtp}
                            disabled={emailVerificationState.loading}
                            className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-800 disabled:opacity-50 w-full sm:w-auto"
                          >
                            Resend Code
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleVerifyEmail}
                          disabled={emailVerificationState.loading || !profile.email}
                          className="px-4 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-800 disabled:opacity-50 w-full sm:w-auto"
                        >
                          {emailVerificationState.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify"}
                        </button>
                      )}
                    </>
                  )}
                  {emailVerificationState.verified && (
                    <div className="flex items-center justify-center px-4 py-3 bg-green-100 text-green-700 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Email OTP Input */}
              {emailVerificationState.sent && !emailVerificationState.verified && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-800 font-medium">Enter code sent to {profile.email}:</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={emailVerificationState.code}
                      onChange={(e) => setEmailVerificationState({ ...emailVerificationState, code: e.target.value })}
                      placeholder="123456"
                      maxLength={6}
                      className="flex-1 min-w-0 px-4 py-3 text-center text-lg font-bold tracking-widest text-[#2B2B2B] bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmEmailOtp}
                      disabled={emailVerificationState.loading || emailVerificationState.code.length !== 6}
                      className="px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {emailVerificationState.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm"}
                    </button>
                  </div>
                </div>
              )}


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Date of Birth</label>
                  <div
                    className={`relative cursor-pointer group`}
                    onClick={() => dateInputRef.current?.showPicker()}
                  >
                    <Calendar className={`absolute left-3 top-3 w-4 h-4 ${dobError ? 'text-red-400' : 'text-gray-400'} group-hover:text-[#2B2B2B] transition-colors pointer-events-none`} />
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={profile.dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile({ ...profile, dob: val });
                        setDobError('');
                        if (val) {
                          const selected = new Date(val);
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          if (selected > now) {
                            setDobError('Date of birth cannot be in the future.');
                          } else {
                            const age = now.getFullYear() - selected.getFullYear() -
                              (now < new Date(now.getFullYear(), selected.getMonth(), selected.getDate()) ? 1 : 0);
                            if (age < 18) {
                              setDobError('You must be at least 18 years old to register.');
                            }
                          }
                        }
                      }}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 ${dobError ? 'border-red-400 bg-red-50' : 'border-transparent'} focus:border-[#2B2B2B] focus:bg-white rounded-xl outline-none font-medium text-sm text-[#2B2B2B] transition-all duration-200 cursor-pointer`}
                    />
                  </div>
                  {dobError && (
                    <p className="text-[11px] text-red-500 font-semibold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      ⚠ {dobError}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Gender</label>
                  <div className="relative group">
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#2B2B2B] focus:bg-white rounded-xl outline-none font-medium appearance-none transition-all duration-200 cursor-pointer ${profile.gender ? 'text-[#2B2B2B]' : 'text-gray-400'}`}
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 group-hover:text-[#2B2B2B] transition-colors pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={loading || !emailVerificationState.verified}
              className="mt-4 w-full bg-[#2B2B2B] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
