import { RealtimeChannel } from '@supabase/supabase-js';
import { CatalogItem, InvoiceData, SellerInfo } from '../types/invoice';
import { isSupabaseConfigured, logActivity, supabase } from './supabase';

/**
 * Real-Time Multi-Device Cloud Sync Engine for InvoCore SaaS.
 * Handles bidirectional synchronization of tenant settings, catalog items,
 * and saved documents, backed by PostgreSQL Realtime channels.
 */

export interface CloudDocumentRecord {
  id: string;
  doc_type: 'invoice' | 'receipt';
  doc_number: string;
  data: InvoiceData;
  created_at: string;
  updated_at: string;
}

/**
 * Pushes updated company branding and settings to `public.tenant_settings`.
 */
export async function syncTenantSettingsToCloud(
  userId: string,
  seller: SellerInfo
): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;

  try {
    const { error } = await supabase.from('tenant_settings').upsert(
      {
        user_id: userId,
        seller_info: seller,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.warn('Sync tenant settings warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Cloud sync error (tenant_settings):', err);
    return false;
  }
}

/**
 * Loads company settings from `public.tenant_settings`.
 */
export async function loadTenantSettingsFromCloud(
  userId: string
): Promise<SellerInfo | null> {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('seller_info')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.seller_info as SellerInfo;
  } catch {
    return null;
  }
}

/**
 * Pushes a catalog item to `public.catalog_items`.
 * Respects free trial quota (max 50 items).
 */
export async function syncCatalogItemToCloud(
  userId: string,
  item: CatalogItem,
  isPro = false
): Promise<{ success: boolean; quotaExceeded?: boolean }> {
  if (!isSupabaseConfigured || !userId) return { success: false };

  try {
    // Check free trial catalog quota
    if (!isPro) {
      const { count } = await supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if ((count ?? 0) >= 50) {
        return { success: false, quotaExceeded: true };
      }
    }

    const { error } = await supabase.from('catalog_items').insert({
      user_id: userId,
      item_code: item.itemCode || null,
      description: item.name || '',
      unit: item.unit || 'وحدة',
      unit_price: item.unitPrice || 0,
      is_taxable: item.isTaxable !== false,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.message.includes('check constraint') || error.message.includes('quota')) {
        return { success: false, quotaExceeded: true };
      }
      return { success: false };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Loads all catalog items from `public.catalog_items`.
 */
export async function loadCatalogItemsFromCloud(
  userId: string
): Promise<CatalogItem[]> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      name: row.description,
      unitPrice: Number(row.unit_price) || 0,
      unit: row.unit || 'وحدة',
      isTaxable: row.is_taxable,
      itemCode: row.item_code || undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Pushes a saved document (invoice or receipt) to `public.saved_documents`.
 * Respects trial quota (max 3 documents).
 */
export async function syncDocumentToCloud(
  userId: string,
  docType: 'invoice' | 'receipt',
  docNumber: string,
  data: InvoiceData,
  isPro = false
): Promise<{ success: boolean; quotaExceeded?: boolean }> {
  if (!isSupabaseConfigured || !userId) return { success: false };

  try {
    if (!isPro) {
      const { count } = await supabase
        .from('saved_documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if ((count ?? 0) >= 3) {
        return { success: false, quotaExceeded: true };
      }
    }

    const { error } = await supabase.from('saved_documents').insert({
      user_id: userId,
      doc_type: docType,
      doc_number: docNumber,
      data,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.message.includes('check constraint') || error.message.includes('quota')) {
        return { success: false, quotaExceeded: true };
      }
      return { success: false };
    }

    await logActivity('SAVE_CLOUD_DOCUMENT', {
      doc_type: docType,
      doc_number: docNumber,
    }, userId);

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Loads all saved documents from `public.saved_documents`.
 */
export async function loadDocumentsFromCloud(
  userId: string
): Promise<InvoiceData[]> {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('saved_documents')
      .select('data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((d) => d.data as InvoiceData);
  } catch {
    return [];
  }
}

/**
 * Subscribes to real-time changes on the user's data across all devices/tabs.
 */
export function subscribeToTenantSync(
  userId: string,
  callbacks: {
    onSettingsChange?: (seller: SellerInfo) => void;
    onCatalogChange?: () => void;
    onDocumentsChange?: () => void;
  }
): RealtimeChannel | null {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const channel = supabase
      .channel(`sync_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as { seller_info?: SellerInfo }).seller_info) {
            callbacks.onSettingsChange?.((payload.new as { seller_info: SellerInfo }).seller_info);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catalog_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          callbacks.onCatalogChange?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_documents',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          callbacks.onDocumentsChange?.();
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('Realtime subscription failed:', err);
    return null;
  }
}
