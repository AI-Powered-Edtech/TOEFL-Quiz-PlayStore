import { apiV2 } from './apiV2';
import { assertSafeId, sqlText } from './securityUtils';

export interface CircleMessageV2 { id: string; circle_id: string; sender_id: string; message: string; created_at: string; }

export async function sendCircleMessageV2(circleId: string, senderId: string, message: string): Promise<boolean> {
  const res = await apiV2.post<{ ok: boolean }>('/api/v2/social/circles/messages', {
    circle_id: assertSafeId(circleId, 'circle_id'),
    sender_id: assertSafeId(senderId, 'sender_id'),
    message: sqlText(message, 500),
  });
  return !!res.ok;
}

export async function listCircleMessagesV2(circleId: string): Promise<CircleMessageV2[]> {
  const res = await apiV2.post<{ messages: CircleMessageV2[] }>('/api/v2/social/circles/messages/list', { circle_id: assertSafeId(circleId, 'circle_id') });
  return Array.isArray(res.messages) ? res.messages.reverse() : [];
}
