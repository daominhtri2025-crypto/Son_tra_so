/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * HTTP client duy nhất của giao diện. Mọi dữ liệu đi qua /api; phiên đăng nhập nằm trong
 * cookie HttpOnly do máy chủ cấp, giao diện không bao giờ đọc hay lưu token.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResult<T = any> {
  status: number;
  body: T & { error?: string };
}

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

const API_BASE = '/api';

async function request<T = any>({ method, path, body }: ApiRequest): Promise<ApiResult<T>> {
  try {
    // Máy chủ bắt buộc Content-Type: application/json cho mọi yêu cầu ghi (POST/PUT/DELETE),
    // kể cả khi không có thân. Vì vậy luôn gửi header này và thân '{}' nếu không có dữ liệu.
    const isWrite = method !== 'GET';
    const response = await fetch(API_BASE + path, {
      method,
      credentials: 'same-origin',
      headers: isWrite
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json' },
      body: isWrite ? JSON.stringify(body ?? {}) : undefined,
    });
    const text = await response.text();
    let parsed: any = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { error: 'Máy chủ trả về dữ liệu không hợp lệ.' };
      }
    }
    return { status: response.status, body: parsed };
  } catch {
    return { status: 0, body: { error: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.' } as any };
  }
}

/**
 * Tải tệp đa phương tiện lên máy chủ (multipart). Trả về URL nội bộ đã lưu.
 */
async function uploadMedia(kind: 'video' | 'audio', file: Blob, filename: string): Promise<ApiResult<{ url: string; kind: string; filename: string }>> {
  try {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file, filename);
    const response = await fetch(API_BASE + '/admin/media', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    const parsed = await response.json().catch(() => ({ error: 'Máy chủ trả về dữ liệu không hợp lệ.' }));
    return { status: response.status, body: parsed };
  } catch {
    return { status: 0, body: { error: 'Tải tệp lên thất bại do lỗi mạng.' } as any };
  }
}

export const apiClient = { request, uploadMedia };
