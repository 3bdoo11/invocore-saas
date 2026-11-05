import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  fetchUserProfile,
  isSupabaseConfigured,
  logActivity,
  supabase,
  UserProfile,
} from '../lib/supabase';

export type AuthModalView = 'signin' | 'signup' | 'verify_otp' | 'forgot_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile, isGuest?: boolean) => void;
  onContinueAsGuest: () => void;
  initialView?: AuthModalView;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onContinueAsGuest,
  initialView = 'signin',
}) => {
  const [activeView, setActiveView] = useState<AuthModalView>(initialView);
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('invocore_lang') as 'ar' | 'en') || 'ar';
  });

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification Fields
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password Stages ('request' | 'verify_and_reset')
  const [forgotStage, setForgotStage] = useState<'request' | 'verify_and_reset'>('request');

  // Anti-Brute-Force Lockout State (5 failed attempts -> 60s lockout)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('invocore_auth_fails') || '0');
    } catch {
      return 0;
    }
  });
  const [lockoutTimer, setLockoutTimer] = useState<number>(() => {
    try {
      const lockUntil = Number(localStorage.getItem('invocore_lockout_until') || '0');
      const diff = Math.ceil((lockUntil - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  });

  // UI Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  // Sync initialView if prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsDuplicateEmail(false);
    }
  }, [isOpen, initialView]);

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem('invocore_lockout_until');
            localStorage.removeItem('invocore_auth_fails');
          } catch {}
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  // Password Strength Checklist Checks
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasNumber;

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    try {
      localStorage.setItem('invocore_lang', nextLang);
    } catch {}
  };

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  // 1. Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDuplicateEmail(false);

    if (lockoutTimer > 0) {
      setErrorMsg(
        isAr
          ? `تم تجميد المحاولات مؤقتاً لأسباب أمنية. يرجى الانتظار (${lockoutTimer} ثانية).`
          : `Too many failed attempts. Please wait ${lockoutTimer}s.`
      );
      return;
    }

    if (!email.trim() || !password) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please provide email and password');
      return;
    }

    if (!isSupabaseConfigured) {
      const localProfile: UserProfile = {
        id: 'local_demo_user',
        email: email.trim(),
        full_name: 'Alex Morgan',
        company_name: 'NovaCore Technologies Ltd.',
        plan_tier: 'free_trial',
        invoices_generated: Number(localStorage.getItem('invocore_usage_local_demo_user') || '0'),
        max_trial_invoices: 3,
      };
      onSuccess(localProfile, false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Reset brute-force counter on success
        try {
          localStorage.removeItem('invocore_auth_fails');
          localStorage.removeItem('invocore_lockout_until');
        } catch {}
        setFailedAttempts(0);

        await logActivity('LOGIN', { method: 'password' }, data.user.id, data.user.email);
        const profile = await fetchUserProfile(data.user);
        onSuccess(profile, false);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);

      // Increment failed attempts
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      try {
        localStorage.setItem('invocore_auth_fails', String(newFails));
      } catch {}

      if (newFails >= 5) {
        const lockoutSeconds = 60;
        setLockoutTimer(lockoutSeconds);
        try {
          localStorage.setItem('invocore_lockout_until', String(Date.now() + lockoutSeconds * 1000));
        } catch {}
        setErrorMsg(
          isAr
            ? `تجاوزت الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم تجميد تسجيل الدخول لمدة 60 ثانية.`
            : `Too many failed attempts. Account locked for 60 seconds.`
        );
      } else if (errMessage.includes('Invalid login credentials')) {
        setErrorMsg(
          isAr
            ? `بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور (${5 - newFails} محاولات متبقية).`
            : `Invalid email or password (${5 - newFails} attempts remaining).`
        );
      } else if (errMessage.toLowerCase().includes('confirm') || errMessage.toLowerCase().includes('not confirmed')) {
        setErrorMsg(
          isAr
            ? 'البريد الإلكتروني لم يتم تأكيده بعد. أدخل رمز التحقق المكون من 6 أرقام لتفعيل حسابك.'
            : 'Email not confirmed yet. Please verify your 6-digit OTP code.'
        );
        setActiveView('verify_otp');
        setResendCooldown(60);
      } else {
        setErrorMsg(errMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDuplicateEmail(false);

    if (!email.trim() || !password) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Email and password are required');
      return;
    }

    if (!isPasswordStrong) {
      setErrorMsg(
        isAr
          ? 'يرجى استيفاء شروط كلمة المرور القوية (8 أحرف، حرف كبير، حرف صغير، ورقم)'
          : 'Please satisfy all password strength requirements (8+ chars, uppercase, lowercase, number)'
      );
      return;
    }

    if (!isSupabaseConfigured) {
      const localProfile: UserProfile = {
        id: 'local_demo_user',
        email: email.trim(),
        full_name: fullName.trim() || 'Alex Morgan',
        company_name: companyName.trim() || 'NovaCore Technologies Ltd.',
        plan_tier: 'free_trial',
        invoices_generated: 0,
        max_trial_invoices: 3,
      };
      onSuccess(localProfile, false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Check for duplicate registered user (Supabase returns empty identities array when user already exists)
        if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setIsDuplicateEmail(true);
          setErrorMsg(
            isAr
              ? 'هذا البريد مسجل مسبقاً في النظام!'
              : 'This email is already registered!'
          );
          return;
        }

        await logActivity(
          'SIGN_UP',
          {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
          data.user.id,
          data.user.email
        );

        if (data.session) {
          // Instant confirmation without OTP
          const profile = await fetchUserProfile(data.user);
          onSuccess(profile, false);
        } else {
          // Requires 6-Digit OTP verification
          setSuccessMsg(
            isAr
              ? `تم إرسال رمز التحقق المكون من 6 أرقام إلى: ${email.trim()}`
              : `A 6-digit verification code has been sent to: ${email.trim()}`
          );
          setActiveView('verify_otp');
          setResendCooldown(60);
        }
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      if (errMessage.toLowerCase().includes('already registered')) {
        setIsDuplicateEmail(true);
        setErrorMsg(
          isAr
            ? 'هذا البريد مسجل مسبقاً في النظام!'
            : 'This email is already registered!'
        );
      } else {
        setErrorMsg(errMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP Handler (Signup confirmation)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const token = otpCode.trim();
    if (!token || token.length !== 6) {
      setErrorMsg(
        isAr ? 'يرجى إدخال رمز التحقق كاملاً المكون من 6 أرقام' : 'Please enter the complete 6-digit code'
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'signup',
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await logActivity('OTP_VERIFIED', { email: data.user.email }, data.user.id, data.user.email);
        const profile = await fetchUserProfile(data.user);
        onSuccess(profile, false);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        isAr
          ? `رمز التحقق غير صحيح أو انتهت صلاحيته (${errMessage}).`
          : `Invalid or expired verification code (${errMessage}).`
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resend({
        type: activeView === 'verify_otp' ? 'signup' : 'signup',
        email: email.trim(),
      });
      if (error) throw error;

      setResendCooldown(60);
      setSuccessMsg(
        isAr
          ? 'تمت إعادة إرسال رمز التحقق بنجاح إلى بريدك!'
          : 'Verification code resent successfully to your email!'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    }
  };

  // 4. Forgot Password Flow
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني لاستعادة الحساب' : 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;

      setForgotStage('verify_and_reset');
      setResendCooldown(60);
      setSuccessMsg(
        isAr
          ? `تم إرسال رمز استعادة كلمة المرور إلى: ${email.trim()}`
          : `A password reset code has been sent to: ${email.trim()}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const token = otpCode.trim();
    if (!token || token.length !== 6) {
      setErrorMsg(
        isAr ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام' : 'Please enter the 6-digit recovery code'
      );
      return;
    }

    if (!isPasswordStrong) {
      setErrorMsg(
        isAr
          ? 'كلمة المرور الجديدة لا تستوفي الشروط (8 أحرف، حرف كبير، حرف صغير، ورقم)'
          : 'New password does not meet requirements'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify recovery OTP
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'recovery',
      });
      if (verifyError) throw verifyError;

      // 2. Set new password
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      await logActivity('PASSWORD_RESET', { email: email.trim() }, updateData.user?.id, email.trim());

      setSuccessMsg(
        isAr
          ? 'تم تغيير كلمة المرور بنجاح! جاري تسجيل الدخول...'
          : 'Password reset successful! Logging you in...'
      );

      if (verifyData.user) {
        const profile = await fetchUserProfile(verifyData.user);
        setTimeout(() => onSuccess(profile, false), 1200);
      } else {
        setTimeout(() => {
          setActiveView('signin');
          setPassword('');
          setConfirmPassword('');
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    await logActivity('GUEST_DEMO_ACCESS', {
      timestamp: new Date().toISOString(),
      source: 'guest_button_click',
    });
    onContinueAsGuest();
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-900 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="bg-[#0F172A] text-white p-5 sm:p-6 relative overflow-hidden border-b-2 border-amber-500 shrink-0">
          <div className="flex items-center justify-between relative z-10 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-md border border-amber-400/40">
                <Layers className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-white">
                    Invo<span className="text-amber-400">Core</span>
                  </span>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                    B2B SaaS
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {isAr ? 'منصة الفوترة الإلكترونية السحابية' : 'Smart Cloud E-Invoicing Platform'}
                </p>
              </div>
            </div>

            {/* Language Switcher & Close Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer border border-white/10"
                title="تغيير لغة الواجهة / Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAr ? 'English' : 'العربية'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title={isAr ? 'إغلاق (Esc)' : 'Close (Esc)'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 relative z-10 leading-relaxed">
            {activeView === 'signin' &&
              (isAr
                ? 'سجل دخولك لمتابعة فواتيرك وتخزين بيانات المنشأة السحابية.'
                : 'Sign in to access your cloud invoices, settings, and team data.')}
            {activeView === 'signup' &&
              (isAr
                ? 'أنشئ حسابك التجريبي فوراً (3 فواتير تجريبية مجانية مع كامل الصلاحيات).'
                : 'Create your trial account (3 free full-featured invoices).')}
            {activeView === 'verify_otp' &&
              (isAr
                ? 'التحقق الثنائي من ملكية البريد الإلكتروني عبر رمز 6 أرقام.'
                : 'Two-step email ownership verification via 6-digit OTP code.')}
            {activeView === 'forgot_password' &&
              (isAr
                ? 'استعادة الحساب وإعادة تعيين كلمة المرور عبر البريد الإلكتروني.'
                : 'Reset your account password securely via email recovery code.')}
          </p>
        </div>

        {/* View Switcher Tabs (Only for Signin / Signup) */}
        {(activeView === 'signin' || activeView === 'signup') && (
          <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveView('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsDuplicateEmail(false);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeView === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsDuplicateEmail(false);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeView === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'إنشاء حساب تجريبي' : 'Create Trial Account'}</span>
            </button>
          </div>
        )}

        {/* Form Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold">{errorMsg}</span>
                {isDuplicateEmail && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('forgot_password');
                        setForgotStage('request');
                        setErrorMsg(null);
                        setIsDuplicateEmail(false);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? 'إذا كان لديك حساب ونسيت كلمة المرور، انقر هنا لإعادة تعيينها كود'
                          : 'Forgot your password? Click here to reset it'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {activeView === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@novacore.io"
                    className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all ${
                      isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('forgot_password');
                      setForgotStage('request');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all ${
                      isAr ? 'pr-9 pl-10' : 'pl-9 pr-10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer ${
                      isAr ? 'left-3' : 'right-3'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutTimer > 0}
                className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{isAr ? 'جاري التحقق...' : 'Authenticating...'}</span>
                  </>
                ) : lockoutTimer > 0 ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>
                      {isAr ? `تجميد مؤقت (${lockoutTimer} ثانية)` : `Locked (${lockoutTimer}s)`}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isAr ? 'تسجيل الدخول إلى المنصة' : 'Sign In to Workspace'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 2: SIGN UP */}
          {activeView === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isAr ? 'مثال: أليكس مورغان' : 'e.g., Alex Morgan'}
                      className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${
                        isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'اسم المنشأة / الشركة' : 'Company Name'}
                  </label>
                  <div className="relative">
                    <Building2 className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة نوفاكور للتقنية' : 'e.g., NovaCore Technologies Ltd.'}
                      className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${
                        isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'البريد الإلكتروني للعمل' : 'Work Email Address'}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@novacore.io"
                    className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${
                      isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 ${
                      isAr ? 'pr-9 pl-10' : 'pl-9 pr-10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer ${
                      isAr ? 'left-3' : 'right-3'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Password Strength Checklist */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                  <div
                    className={`flex items-center gap-1 font-bold ${
                      hasMinLen ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${hasMinLen ? 'text-emerald-600 stroke-[3]' : 'opacity-40'}`} />
                    <span>{isAr ? '8 أحرف على الأقل' : 'Min 8 characters'}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-bold ${
                      hasUpper ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${hasUpper ? 'text-emerald-600 stroke-[3]' : 'opacity-40'}`} />
                    <span>{isAr ? 'حرف كبير (Uppercase)' : '1 uppercase letter'}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-bold ${
                      hasLower ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${hasLower ? 'text-emerald-600 stroke-[3]' : 'opacity-40'}`} />
                    <span>{isAr ? 'حرف صغير (Lowercase)' : '1 lowercase letter'}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-bold ${
                      hasNumber ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-600 stroke-[3]' : 'opacity-40'}`} />
                    <span>{isAr ? 'رقم واحد على الأقل' : '1 number'}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordStrong}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{isAr ? 'جاري إنشاء الحساب...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>{isAr ? 'إنشاء حساب وتفعيل التجربة المجانية' : 'Create Trial Account'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 3: 6-DIGIT OTP VERIFICATION */}
          {activeView === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-300/50 rounded-2xl p-4 text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-2">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900">
                  {isAr ? 'أدخل رمز التحقق (6 أرقام)' : 'Enter 6-Digit Verification Code'}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isAr
                    ? `تم إرسال كود التحقق إلى البريد: `
                    : `We sent a verification code to: `}
                  <strong className="text-slate-900 font-mono">{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 text-center mb-2">
                  {isAr ? 'رمز التحقق السريع' : 'Verification Code'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[10px] text-2xl font-mono font-black border-2 border-amber-400 focus:border-amber-600 rounded-2xl py-3 outline-none shadow-inner bg-slate-50/50"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className="font-bold text-amber-700 hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'text-amber-600'}`} />
                  <span>
                    {resendCooldown > 0
                      ? isAr
                        ? `إعادة إرسال الرمز (${resendCooldown} ثانية)`
                        : `Resend code (${resendCooldown}s)`
                      : isAr
                      ? 'إعادة إرسال الرمز'
                      : 'Resend Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('signin')}
                  className="text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                >
                  {isAr ? 'تغيير البريد / العودة' : 'Change Email'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{isAr ? 'جاري التحقق من الرمز...' : 'Verifying Code...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>{isAr ? 'تأكيد الرمز وبدء الاستخدام' : 'Verify & Continue'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 4: FORGOT PASSWORD / RESET PASSWORD */}
          {activeView === 'forgot_password' && (
            <div className="space-y-4">
              {forgotStage === 'request' ? (
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto mb-2">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-black text-slate-900">
                      {isAr ? 'استعادة كلمة المرور' : 'Password Recovery'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isAr
                        ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رمزاً للتحقق وإعادة التعيين.'
                        : 'Enter your registered email and we will send a recovery code.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'البريد الإلكتروني' : 'Registered Email'}
                    </label>
                    <div className="relative">
                      <Mail className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@novacore.io"
                        className={`w-full text-xs font-semibold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 ${
                          isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>{isAr ? 'جاري الإرسال...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>{isAr ? 'إرسال رمز الاستعادة (OTP)' : 'Send Recovery Code'}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveView('signin')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5">
                  <div className="text-center space-y-1">
                    <h4 className="text-xs font-black text-slate-900">
                      {isAr ? 'تعيين كلمة المرور الجديدة' : 'Set New Password'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isAr ? `أدخل الرمز المرسل إلى: ` : `Enter code sent to: `}
                      <strong className="text-slate-800">{email}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'رمز الاستعادة (6 أرقام)' : 'Recovery Code (6 Digits)'}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[8px] text-lg font-mono font-black border border-slate-300 rounded-xl py-2 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Password Strength Checklist */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 grid grid-cols-2 gap-1 text-[10px]">
                    <div className={`flex items-center gap-1 ${hasMinLen ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isAr ? '8 أحرف' : '8+ chars'}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isAr ? 'حرف كبير' : 'Uppercase'}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isAr ? 'حرف صغير' : 'Lowercase'}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      <Check className="w-3 h-3" />
                      <span>{isAr ? 'رقم واحد' : 'Number'}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isPasswordStrong || password !== confirmPassword}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 fill-slate-950" />
                        <span>{isAr ? 'حفظ وتأكيد كلمة المرور' : 'Save & Set Password'}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setForgotStage('request')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      {isAr ? 'إعادة طلب الكود' : 'Re-request Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Quick Recruiter / Guest Preview Access Pod */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleGuestAccess}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200/80"
              title="معاينة فورية للمنصة بدون تسجيل دخول"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>
                {isAr
                  ? '⚡ معاينة سريعة كزائر (علامة مائية تجريبية)'
                  : '⚡ Quick Guest Preview (Watermarked Demo)'}
              </span>
            </button>
          </div>
        </div>

        {/* Global Security Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? 'مشفر عبر Supabase PostgreSQL' : 'Encrypted via Supabase PostgreSQL'}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {isAr ? 'نسخة 2026 الرسمية' : 'InvoCore 2026'}
          </div>
        </div>
      </div>
    </div>
  );
};
