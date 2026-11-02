/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Khôi phục mật khẩu: yêu cầu liên kết qua email và đặt mật khẩu mới từ liên kết.
 */

import React, { useState } from 'react';
import { KeyRound, Mail, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../services/apiClient';

/** Biểu mẫu nhập email để nhận liên kết đặt lại mật khẩu. Phản hồi luôn chung để không lộ tài khoản. */
export const ForgotPasswordForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const res = await apiClient.request<{ message: string }>({ method: 'POST', path: '/auth/forgot-password', body: { email } });
    setIsLoading(false);
    if (res.status === 200) setMessage(res.body.message);
    else setError(res.body.error || 'Không gửi được yêu cầu. Vui lòng thử lại.');
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-emerald-700" /> Quên mật khẩu
      </h3>
      {message ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {message}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="forgot-email" className="block text-xs font-bold text-gray-700">Email tài khoản</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
            <input
              id="forgot-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl"
          >
            {isLoading ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
          </button>
        </form>
      )}
      <button type="button" onClick={onBack} className="text-xs font-semibold text-emerald-800 underline">
        Quay lại đăng nhập
      </button>
    </div>
  );
};

/** Hộp thoại đặt mật khẩu mới, mở khi người dùng bấm liên kết trong thư. */
export const PasswordResetModal: React.FC<{
  token: string;
  onDone: (message: string) => void;
  onClose: () => void;
}> = ({ token, onDone, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const res = await apiClient.request<{ message: string }>({
      method: 'POST',
      path: '/auth/reset-password',
      body: { token, newPassword, confirmPassword },
    });
    setIsLoading(false);
    if (res.status === 200) onDone(res.body.message);
    else setError(res.body.error || 'Không đặt lại được mật khẩu.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-title">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700" aria-label="Đóng">
          <X className="w-5 h-5" />
        </button>
        <h2 id="reset-title" className="text-lg font-black text-gray-900">Đặt mật khẩu mới</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="reset-new" className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu mới (10–200 ký tự)</label>
            <input id="reset-new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" required minLength={10} maxLength={200} />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="block text-xs font-bold text-gray-700 mb-1">Nhập lại mật khẩu mới</label>
            <input id="reset-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" required minLength={10} maxLength={200} />
          </div>
          {error && (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <button type="submit" disabled={isLoading} className="w-full min-h-[44px] py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl">
            {isLoading ? 'Đang lưu…' : 'Đặt mật khẩu mới'}
          </button>
        </form>
      </div>
    </div>
  );
};
