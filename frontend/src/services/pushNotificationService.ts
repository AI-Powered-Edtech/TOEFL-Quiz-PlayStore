import { PushNotifications, Token } from '@capacitor/push-notifications';

import api from './apiClient';

class PushNotificationService {
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
        if (!isNative) {
            console.debug("[PushNotification] Skipped: only supported on native devices.");
            return;
        }

        try {
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn("Push notification permission not granted.");
                return;
            }

            await PushNotifications.register();
            this.setupListeners();
            this.isInitialized = true;
            console.log("Push notifications initialized and registered.");
        } catch (error) {
            console.error("Failed to initialize push notifications", error);
        }
    }

    private setupListeners() {
        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            await this.syncToken(token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ', notification);
        });
    }

    private async syncToken(fcmToken: string) {
        try {
            await api.patch('/api/auth/profile', { fcm_token: fcmToken });
            console.log("FCM token synced successfully.");
        } catch (error) {
            console.error("Error during FCM token sync:", error);
        }
    }

    async clearToken() {
        try {
            await api.patch('/api/auth/profile', { fcm_token: null });
            if (this.isInitialized) {
                await PushNotifications.removeAllListeners();
                this.isInitialized = false;
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError' && !e?.message?.includes('Fetch is aborted')) {
                console.error("Failed to clear FCM token", e);
            }
        }
    }
}

export const pushNotificationService = new PushNotificationService();