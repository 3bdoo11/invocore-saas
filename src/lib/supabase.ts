import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const LIVE_SUPABASE_URL = 'https://gfevoljcqvxncmksfnlr.supabase.co';
export const LIVE_SUPABASE_ANON_KEY = 'sb_publishable_Bl1yBgjWmq4WWjSzpXqeUw_2CTu02sC';

const rawUrl = (env.VITE_SUPABASE_URL || LIVE_SUPABASE_URL).trim();
const rawKey = (env.VITE_SUPABASE_ANON_KEY || LIVE_SUPABASE_ANON_KEY).trim();

export const supabaseUrl = rawUrl.replace(/^\[|\]$/g, '').trim();
export const supabaseAnonKey = rawKey.replace(/^\[|\]$/g, '').trim();

export const isSupabaseConfigured: boolean = true;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  plan_tier: 'free_trial' | 'pro';
  invoices_generated: number;
  max_trial_invoices: number;
  created_at?: string;
  last_active_at?: string;
}

export type ActionType =
  | 'SIGN_UP'
  | 'LOGIN'
  | 'LOGOUT'
  | 'GUEST_DEMO_ACCESS'
  | 'PRINT_INVOICE'
  | 'EXPORT_EXCEL'
  | 'LIMIT_REACHED'
  | 'UPGRADE_CLICK';

/**
 * Inserts an audit activity log entry for admin monitoring.
 * Fails silently to ensure offline/demo users can still use the system smoothly.
 */
export async function logActivity(
  actionType: ActionType | string,
  metadata: Record<string, unknown> = {},
  userId?: string | null,
  userEmail?: string | null
): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    let resolvedUserId = userId;
    let resolvedEmail = userEmail;

    if (!resolvedUserId) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        resolvedUserId = data.session.user.id;
        resolvedEmail = data.session.user.email || null;
      }
    }

    await supabase.from('activity_logs').insert([
      {
        user_id: resolvedUserId || null,
        user_email: resolvedEmail || 'guest@invocore.saas',
        action_type: actionType,
        metadata: {
          ...metadata,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          timestamp: new Date().toISOString(),
        },
      },
    ]);
  } catch {
    // Graceful error silence for non-blocking UI logging
  }
}

/**
 * Fetches the user's profile from `public.profiles`.
 * If missing (e.g. trigger lag or guest demo), provisions a default local profile.
 */
export async function fetchUserProfile(user: User): Promise<UserProfile> {
  if (!isSupabaseConfigured) {
    return {
      id: user.id,
      email: user.email || '',
      full_name: (user.user_metadata?.full_name as string) || 'مستخدم تجريبي',
      company_name: (user.user_metadata?.company_name as string) || 'منشأة تجريبية',
      plan_tier: 'free_trial',
      invoices_generated: 0,
      max_trial_invoices: 3,
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error.message);
    }

    if (data) {
      return data as UserProfile;
    }

    // Auto-create profile if trigger didn't fire
    const fallbackProfile: UserProfile = {
      id: user.id,
      email: user.email || '',
      full_name: (user.user_metadata?.full_name as string) || '',
      company_name: (user.user_metadata?.company_name as string) || '',
      plan_tier: 'free_trial',
      invoices_generated: 0,
      max_trial_invoices: 3,
    };

    await supabase.from('profiles').upsert(fallbackProfile);
    return fallbackProfile;
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return {
      id: user.id,
      email: user.email || '',
      full_name: (user.user_metadata?.full_name as string) || '',
      company_name: (user.user_metadata?.company_name as string) || '',
      plan_tier: 'free_trial',
      invoices_generated: 0,
      max_trial_invoices: 3,
    };
  }
}

/**
 * Atomically increments the user's invoice count in PostgreSQL.
 * Falls back to local storage if offline or unconfigured.
 */
export async function incrementInvoiceCounter(
  user: User | null
): Promise<{ invoices_generated: number; plan_tier: 'free_trial' | 'pro'; max_trial_invoices: number }> {
  if (!isSupabaseConfigured || !user) {
    // Local storage fallback for guest or unconfigured Supabase
    const key = user ? `invocore_usage_${user.id}` : 'invocore_guest_usage';
    const current = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(current));
    return {
      invoices_generated: current,
      plan_tier: 'free_trial',
      max_trial_invoices: 3,
    };
  }

  try {
    // Try RPC first for atomic update
    const { data, error } = await supabase.rpc('increment_invoice_count');
    if (!error && data) {
      return {
        invoices_generated: Number(data.invoices_generated ?? 1),
        plan_tier: (data.plan_tier as 'free_trial' | 'pro') || 'free_trial',
        max_trial_invoices: Number(data.max_trial_invoices ?? 3),
      };
    }

    // Direct fallback if RPC is not created yet
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('invoices_generated, plan_tier, max_trial_invoices')
      .eq('id', user.id)
      .single();

    const nextCount = (currentProfile?.invoices_generated ?? 0) + 1;
    const plan = (currentProfile?.plan_tier as 'free_trial' | 'pro') || 'free_trial';
    const max = currentProfile?.max_trial_invoices ?? 3;

    await supabase
      .from('profiles')
      .update({
        invoices_generated: nextCount,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await logActivity('PRINT_INVOICE', {
      invoices_generated: nextCount,
      plan_tier: plan,
    }, user.id, user.email);

    return {
      invoices_generated: nextCount,
      plan_tier: plan,
      max_trial_invoices: max,
    };
  } catch (err) {
    console.error('Error incrementing invoice count:', err);
    return {
      invoices_generated: 1,
      plan_tier: 'free_trial',
      max_trial_invoices: 3,
    };
  }
}
