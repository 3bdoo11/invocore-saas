import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  X,
  Zap,
} from 'lucide-react';
import { isSupabaseConfigured, logActivity, supabase, UserProfile } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile, isGuest?: boolean) => void;
  onContinueAsGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onContinueAsGuest,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please provide email and password');
      return;
    }

    if (!isSupabaseConfigured) {
      // Local fallback sign-in
      const localProfile: UserProfile = {
        id: 'local_demo_user',
        email: email.trim(),
        full_name: 'مستخدم محلي تجريبي',
        company_name: 'شركة تجريبية',
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
        await logActivity('LOGIN', { method: 'password' }, data.user.id, data.user.email);

        // Fetch their public profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email.trim(),
          full_name: profileData?.full_name || (data.user.user_metadata?.full_name as string) || 'مشترك InvoCore',
          company_name: profileData?.company_name || (data.user.user_metadata?.company_name as string) || 'منشأة الفوترة',
          plan_tier: (profileData?.plan_tier as 'free_trial' | 'pro') || 'free_trial',
          invoices_generated: profileData?.invoices_generated ?? 0,
          max_trial_invoices: profileData?.max_trial_invoices ?? 3,
        };

        onSuccess(profile, false);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      if (errMessage.includes('Invalid login credentials')) {
        setErrorMsg(isAr ? 'بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.' : 'Invalid email or password.');
      } else {
        setErrorMsg(errMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Email and password are required');
      return;
    }

    if (password.length < 6) {
      setErrorMsg(isAr ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف' : 'Password must be at least 6 characters');
      return;
    }

    if (!isSupabaseConfigured) {
      // Local fallback mode
      const localProfile: UserProfile = {
        id: 'local_demo_user',
        email: email.trim(),
        full_name: fullName.trim() || 'مشترك جديد',
        company_name: companyName.trim() || 'منشأة جديدة',
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
        // Log signup
        await logActivity('SIGN_UP', {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
        }, data.user.id, data.user.email);

        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email.trim(),
          full_name: fullName.trim() || 'مشترك جديد',
          company_name: companyName.trim() || 'منشأة جديدة',
          plan_tier: 'free_trial',
          invoices_generated: 0,
          max_trial_invoices: 3,
        };

        // If email confirmation is disabled or session returned immediately
        if (data.session) {
          onSuccess(profile, false);
        } else {
          setSuccessMsg(
            isAr
              ? 'تم إنشاء حسابك التجريبي بنجاح! إذا كانت رسالة التفعيل مطلوبة يرجى فحص بريدك أو تسجيل الدخول مباشرة.'
              : 'Trial account created! You can now sign in.'
          );
          setActiveTab('signin');
        }
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      setErrorMsg(errMessage);
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
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="bg-[#0F172A] text-white p-6 relative overflow-hidden border-b-2 border-amber-500">
          <div className="flex items-center justify-between relative z-10 mb-3">
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
                <div className="text-[11px] text-slate-400 font-medium">
                  {isAr ? 'منصة الفوترة الإلكترونية السحابية الذكية' : 'Smart B2B E-Invoicing Platform'}
                </div>
              </div>
            </div>

            {/* Language Toggle & Close Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLang(isAr ? 'en' : 'ar')}
                className="text-xs font-bold text-amber-300 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/20 transition-colors cursor-pointer"
              >
                {isAr ? 'English' : 'عربي'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isAr ? 'إغلاق والعودة للمعينة' : 'Close and return to workspace'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h2 className="text-base sm:text-lg font-black text-white">
            {activeTab === 'signin'
              ? isAr
                ? 'تسجيل الدخول إلى حساب المنشأة'
                : 'Sign In to Your Company Portal'
              : isAr
                ? 'إنشاء حساب تجريبي مجاني (3 فواتير)'
                : 'Create Free Trial Account (3 Invoices)'}
          </h2>

          {/* Auth Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 mt-4 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-black rounded-lg transition-all ${
                activeTab === 'signin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-black rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'حساب تجريبي جديد' : 'New Free Trial'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={activeTab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
            {activeTab === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    {isAr ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isAr ? 'مثال: عبد الله محمد' : 'e.g. Abdallah Mohamed'}
                      className={`w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 ${
                        isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    {isAr ? 'اسم المنشأة / الشركة' : 'Company Name'}
                  </label>
                  <div className="relative">
                    <Building2 className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة الحلول المتقدمة' : 'e.g. InvoCore Solutions LLC'}
                      className={`w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 ${
                        isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                      }`}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 ${
                    isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? 'right-3' : 'left-3'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full text-xs font-bold border border-slate-300 rounded-xl py-2.5 outline-none focus:border-amber-500 ${
                    isAr ? 'pr-9 pl-9 text-right' : 'pl-9 pr-9 text-left'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-2.5 text-slate-400 hover:text-slate-600 ${isAr ? 'left-3' : 'right-3'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white font-black text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : activeTab === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'تسجيل الدخول إلى المنصة' : 'Sign In to InvoCore'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? 'إنشاء حساب تجريبي وبدء الفوترة' : 'Create Free Trial Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Recruiter / Guest Demo Preview Button */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[11px] text-center text-slate-500 font-semibold">
              {isAr ? 'تريد الاطلاع السريع دون إنشاء حساب؟' : 'Just reviewing or evaluating the platform?'}
            </div>

            <button
              type="button"
              onClick={handleGuestAccess}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>
                {isAr
                  ? '⚡ معاينة سريعة كزائر (علامة مائية تجريبية)'
                  : '⚡ Quick Guest Preview (Watermarked)'}
              </span>
            </button>
            <p className="text-[10px] text-center text-slate-400">
              {isAr
                ? 'تتيح للمسؤولين والمختبرين تجربة كامل خصائص النظام مع رصيد تجريبي مقيد.'
                : 'Instant access with trial usage limit and audit logging.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
