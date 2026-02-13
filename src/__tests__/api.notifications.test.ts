import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../lib/api';

describe('ApiClient - notifications', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn();
    localStorage.setItem('authToken', 'token-123');
  });

  it('calls markNotificationRead with POST', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
      headers: new Headers({'content-length': '2'})
    });

    await apiClient.markNotificationRead(42);

    // @ts-ignore
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/notifications/42/mark_as_read/'), expect.objectContaining({ method: 'POST' }));
  });

  it('calls getNotifications without params', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([]),
      headers: new Headers({'content-length': '2'})
    });

    await apiClient.getNotifications();

    // @ts-ignore
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/notifications/'), expect.any(Object));
  });
});
