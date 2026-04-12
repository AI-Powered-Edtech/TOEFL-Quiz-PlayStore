import { PushNotifications, Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';

/**
 * Push Notification Service
 * Manages Capacitor Push Notifications, requests permissions, and syncing FCM tokens with Supabase.
 */

class PushNotificationService {
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        // Check if running in a Capacitor native context. Push notifications don't work natively in standard web browsers out of the box.
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
        if (!isNative) {
            console.debug("[PushNotification] Skipped: only supported on native devices.");
            return;
        }

        try {
            // Request permission to use push notifications
            // iOS will prompt user and return if they granted permission
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn("Push notification permission not granted.");
                return;
            }

            // Register with Apple / Google to receive push via APNS/FCM
            await PushNotifications.register();
            this.setupListeners();
            this.isInitialized = true;
            console.log("Push notifications initialized and registered.");
        } catch (error) {
            console.error("Failed to initialize push notifications", error);
        }
    }

    private setupListeners() {
        // On success, we should be able to receive notifications
        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            await this.syncTokenWithSupabase(token.value);
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ', notification);
            // In a real app, you might trigger a local toast or UI update here.
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ', notification);
            // Handle routing based on notification data
            // E.g. if (notification.notification.data.route) navigate(route);
        });
    }

    private async syncTokenWithSupabase(fcmToken: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Not signed in

            // Update the profile's FCM token
            const { error } = await supabase
                .from('profiles')
                .update({ fcm_token: fcmToken })
                .eq('id', user.id);

            if (error) {
                console.error("Failed to sync FCM token to Supabase", error);
            } else {
                console.log("FCM token synced successfully to user profile.");
            }
        } catch (error) {
            console.error("Error during FCM token sync:", error);
        }
    }

    // Called on Logout or specifically to revoke push
    async clearToken() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ fcm_token: null })
                    .eq('id', user.id);
            }
            if (this.isInitialized) {
                await PushNotifications.removeAllListeners();
                this.isInitialized = false;
            }
        } catch (e: any) {
            // Ignore AbortError caused by React Strict Mode or navigation
            if (e?.name !== 'AbortError' && !e?.message?.includes('Fetch is aborted')) {
                console.error("Failed to clear FCM token", e);
            }
        }
    }
}

export const pushNotificationService = new PushNotificationService();
