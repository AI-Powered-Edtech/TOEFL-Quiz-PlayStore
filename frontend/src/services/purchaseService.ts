/**
 * Purchase Service — Google Play Billing Direct Integration
 * 
 * Uses @capgo/native-purchases for native Google Play Billing.
 * Falls back gracefully in web/browser environments.
 * 
 * Flow:
 * 1. User taps "Subscribe" in PaywallSheet
 * 2. purchaseSubscription() → Google Play purchase dialog
 * 3. On success → verifyAndActivate() → Edge Function validates receipt
 * 4. Edge Function updates DB → clearTierCache() → UI refreshes
 */

import { Capacitor } from '@capacitor/core';

import authService from './auth';
import { apiClient } from './apiClient';
import { clearTierCache, type SubscriptionTier } from './subscriptionService';
import { useAuthStore } from '../stores/useAuthStore';

// ============================================
// Product IDs (must match Google Play Console)
// ============================================

export const PRODUCT_IDS = {
    basic_monthly: 'basic_monthly',
    c2_monthly: 'c2_monthly',
} as const;

export type ProductId = keyof typeof PRODUCT_IDS;

const PRODUCT_TO_TIER: Record<string, SubscriptionTier> = {
    basic_monthly: 'basic',
    c2_monthly: 'c2',
};

// ============================================
// Types
// ============================================

export interface PurchaseResult {
    success: boolean;
    tier?: SubscriptionTier;
    error?: string;
    productId?: string;
    purchaseToken?: string;
    expiryDate?: string;
    isTrial?: boolean;
}

export interface ProductInfo {
    id: string;
    title: string;
    price: string;
    priceAmount: number;
    currencyCode: string;
}

// ============================================
// Native Module (lazy loaded)
// ============================================

let _nativePurchases: any = null;

async function getNativePurchases() {
    if (_nativePurchases) return _nativePurchases;

    if (!Capacitor.isNativePlatform()) {
        console.warn('[Purchase] Not on native platform — billing unavailable');
        return null;
    }

    try {
        const { NativePurchases } = await import('@capgo/native-purchases');
        _nativePurchases = NativePurchases;
        return _nativePurchases;
    } catch (err) {
        console.error('[Purchase] Failed to load native purchases plugin:', err);
        return null;
    }
}

// ============================================
// Billing Support Check
// ============================================

/**
 * Check if Google Play Billing is available on this device.
 */
export async function isBillingAvailable(): Promise<boolean> {
    const plugin = await getNativePurchases();
    if (!plugin) return false;

    try {
        const { isBillingSupported } = await plugin.isBillingSupported();
        return isBillingSupported;
    } catch (err) {
        console.error('[Purchase] Billing support check failed:', err);
        return false;
    }
}

// ============================================
// Product Info
// ============================================

/**
 * Fetch product details from Google Play.
 * Returns localized prices and descriptions.
 */
export async function getAvailableProducts(): Promise<ProductInfo[]> {
    const plugin = await getNativePurchases();
    if (!plugin) return [];

    try {
        const { products } = await plugin.getProducts({
            productIdentifiers: Object.values(PRODUCT_IDS),
            productType: 'subs',
        });

        return products.map((p: any) => ({
            id: p.identifier,
            title: p.title,
            price: p.priceString,
            priceAmount: p.price,
            currencyCode: p.currencyCode,
        }));
    } catch (err) {
        console.error('[Purchase] Failed to fetch products:', err);
        return [];
    }
}

// ============================================
// Purchase Flow
// ============================================

/**
 * Initiate a subscription purchase.
 * Opens Google Play purchase dialog → verifies on server → activates tier.
 */
export async function purchaseSubscription(
    productId: ProductId,
    planIdentifier?: string
): Promise<PurchaseResult> {
    const plugin = await getNativePurchases();

    if (!plugin) {
        // Web fallback — for testing
        console.warn('[Purchase] No billing plugin. Running in web mode.');
        return {
            success: false,
            error: 'In-app purchases only available on Android. Please install the app from Google Play Store.',
        };
    }

    try {
        const userId =
            useAuthStore.getState().user?.id ?? (await authService.getProfile())?.id ?? null;
        if (!userId) {
            return { success: false, error: 'Silakan login terlebih dahulu' };
        }

        // Use a hashed user ID as appAccountToken (Android allows any string <=64 chars)
        const appAccountToken = userId.replace(/-/g, '').substring(0, 64);

        console.log(`[Purchase] Starting purchase: ${productId}`);

        // Trigger Google Play purchase dialog
        // Set autoAcknowledgePurchases to false — we acknowledge after server verification
        const transaction = await plugin.purchaseProduct({
            productIdentifier: productId,
            productType: 'subs',
            planIdentifier: planIdentifier || `${productId}-base`,
            appAccountToken,
            autoAcknowledgePurchases: false,
        });

        console.log('[Purchase] Transaction received:', {
            id: transaction.transactionId,
            product: transaction.productIdentifier,
            state: transaction.purchaseState,
        });

        // Verify purchase state
        if (transaction.purchaseState !== '1') {
            // Purchase pending or failed
            return {
                success: false,
                error: transaction.purchaseState === '0'
                    ? 'Pembayaran sedang diproses. Langganan akan aktif setelah pembayaran selesai.'
                    : 'Pembelian gagal. Silakan coba lagi.',
            };
        }

        // Verify and activate on server
        const result = await verifyAndActivate(transaction.purchaseToken!, transaction.productIdentifier);

        if (result.success) {
            // Acknowledge the purchase after successful verification
            try {
                await plugin.acknowledgePurchase({
                    purchaseToken: transaction.purchaseToken!,
                });
                console.log('[Purchase] Purchase acknowledged');
            } catch (ackErr) {
                console.error('[Purchase] Acknowledgment failed (will retry):', ackErr);
                // Server can also acknowledge — not fatal
            }
        }

        return result;
    } catch (err: any) {
        console.error('[Purchase] Purchase error:', err);

        // Handle common Google Play error codes
        const message = err?.message || err?.toString() || '';

        if (message.includes('USER_CANCELED') || message.includes('userCancelled')) {
            return { success: false, error: 'cancelled' };
        }
        if (message.includes('ITEM_ALREADY_OWNED')) {
            // Try to restore
            return restorePurchases();
        }
        if (message.includes('BILLING_UNAVAILABLE')) {
            return { success: false, error: 'Google Play Billing tidak tersedia di perangkat ini' };
        }

        return {
            success: false,
            error: 'Terjadi kesalahan saat memproses pembelian. Silakan coba lagi.',
        };
    }
}

// ============================================
// Server Verification
// ============================================

/**
 * Send purchase token to Edge Function for verification.
 * The Edge Function validates with Google Play API and updates the DB.
 */
async function verifyAndActivate(
    purchaseToken: string,
    productId: string,
): Promise<PurchaseResult> {
    try {
        const response = await apiClient.post<any>('/api/purchases/verify', {
            product_id: productId,
            purchase_token: purchaseToken,
        });

        if (response.error) {
            return { success: false, error: response.error.error };
        }

        const tier = (response.data?.tier as SubscriptionTier) || PRODUCT_TO_TIER[productId] || 'basic';
        clearTierCache();

        return {
            success: true,
            tier,
            productId,
            purchaseToken,
            expiryDate: response.data?.expiry_date || undefined,
            isTrial: false,
        };
    } catch (err) {
        console.error('[Purchase] Server verification error:', err);
        return {
            success: false,
            error: 'Gagal menghubungi server. Cek koneksi internet kamu.',
        };
    }
}

// ============================================
// Restore Purchases
// ============================================

/**
 * Restore previous purchases (e.g., after reinstall).
 * Queries Google Play for active subscriptions and re-verifies them.
 */
export async function restorePurchases(): Promise<PurchaseResult> {
    const plugin = await getNativePurchases();

    if (!plugin) {
        return { success: false, error: 'Restore hanya tersedia di perangkat Android' };
    }

    try {
        const userId =
            useAuthStore.getState().user?.id ?? (await authService.getProfile())?.id ?? null;
        if (!userId) {
            return { success: false, error: 'Silakan login terlebih dahulu' };
        }

        console.log('[Purchase] Restoring purchases...');

        // Get active subscription purchases
        const { purchases } = await plugin.getPurchases({
            productType: 'subs',
        });

        if (!purchases || purchases.length === 0) {
            return { success: false, error: 'Tidak ditemukan langganan aktif' };
        }

        // Find the most recent valid purchase
        const validPurchase = purchases.find(
            (p: any) => p.purchaseState === '1' && p.purchaseToken
        );

        if (!validPurchase) {
            return { success: false, error: 'Tidak ditemukan langganan aktif yang valid' };
        }

        // Re-verify on server
        return verifyAndActivate(validPurchase.purchaseToken!, validPurchase.productIdentifier);
    } catch (err) {
        console.error('[Purchase] Restore error:', err);
        return {
            success: false,
            error: 'Gagal memulihkan langganan. Silakan coba lagi.',
        };
    }
}

// ============================================
// Manage Subscription
// ============================================

/**
 * Open Google Play subscription management page.
 */
export async function openSubscriptionManagement(): Promise<void> {
    const plugin = await getNativePurchases();
    if (plugin) {
        try {
            await plugin.manageSubscriptions();
        } catch (err) {
            console.error('[Purchase] Failed to open subscription management:', err);
        }
    }
}
