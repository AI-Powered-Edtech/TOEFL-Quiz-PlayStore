const fs = require('fs');
const path = './frontend/src/services/adminService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
`export async function getCurrentUserRole(): Promise<UserRole | null> {
    try {
        const response = await apiClient.get<any>('/api/auth/profile');
        if (response.error || !response.data) return null;
        return response.data?.user?.role || response.data?.role || 'user';
    } catch {
        return null;
    }
}`,
`export async function getCurrentUserRole(): Promise<UserRole | null> {
    try {
        const token = localStorage.getItem('access_token');
        if (token) {
            const payloadB64 = token.split('.')[1];
            if (payloadB64) {
                const payloadStr = atob(payloadB64);
                const payload = JSON.parse(payloadStr);
                if (payload.role) {
                    return payload.role;
                }
            }
        }
        
        // Fallback to profile check if not in token
        const response = await apiClient.get<any>('/api/auth/profile');
        if (response.error || !response.data) return null;
        return response.data?.user?.role || response.data?.role || 'user';
    } catch (e) {
        return null;
    }
}`);
fs.writeFileSync(path, code);
