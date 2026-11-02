/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Nút đăng nhập Google (Google Identity Services). Chỉ hiển thị khi đã cấu hình VITE_GOOGLE_CLIENT_ID.
 * Thông tin xác thực (ID token) được máy chủ kiểm tra; giao diện không tự khai danh tính.
 */

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';
const CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

let scriptPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Không tải được dịch vụ đăng nhập Google.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface Props {
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}

export const GoogleSignInButton: React.FC<Props> = ({ onCredential, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response.credential) handlers.current.onCredential(response.credential);
            else handlers.current.onError('Google không trả về thông tin xác thực.');
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          locale: 'vi',
          width: 320,
        });
        setReady(true);
      })
      .catch((err: Error) => handlers.current.onError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
        Đăng nhập Google chưa được cấu hình trên hệ thống. Vui lòng dùng email và mật khẩu.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 min-h-[44px]">
      <div ref={containerRef} />
      {!ready && <span className="text-xs text-gray-500">Đang tải dịch vụ đăng nhập Google…</span>}
    </div>
  );
};
