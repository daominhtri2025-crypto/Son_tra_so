/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hộp thoại Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên
 * Thực thi FR-AUTH-07 và Quy tắc nghiệp vụ 4.14 (Mật khẩu 10 - 200 ký tự)
 */

import React, { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { UserContext } from '../types';
import { Lock, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForcedChangePasswordModalProps {
  user: UserContext;
  sessionToken: string;
  onPasswordChanged: (updatedUser: UserContext) => void;
}

export const ForcedChangePasswordModal: React.FC<ForcedChangePasswordModalProps> = ({
  user,
  sessionToken,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Quy tắc 4.13: Mật khẩu từ 10 đến 200 ký tự
    if (newPassword.length < 10 || newPassword.length > 200) {
      setErrorMessage('Mật khẩu mới phải có độ dài từ 10 đến 200 ký tự theo Quy tắc 4.13.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.request({
        method: 'POST',
        path: '/auth/change-password',
        body: { newPassword },
      });

      if (response.status === 200) {
        // Cập nhật người dùng với cờ mustChange = 0
        const updatedUser: UserContext = {
          ...user,
          mustChange: 0,
        };
        onPasswordChanged(updatedUser);
      } else {
        setErrorMessage(response.body.error || 'Đổi mật khẩu thất bại.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi xử lý yêu cầu đổi mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-2 border-amber-400 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-700 font-mono uppercase bg-amber-50 px-2 py-0.5 rounded">
              Yêu cầu bắt buộc (FR-AUTH-07)
            </span>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">
              Đổi Mật khẩu Lần đầu
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          Tài khoản <strong>{user.email}</strong> vừa được cấp mới hoặc đặt lại. Theo <strong>Quy tắc nghiệp vụ 4.14</strong>, bạn bắt buộc phải thiết lập mật khẩu cá nhân mới trước khi sử dụng các chức năng của hệ thống.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Mật khẩu mới (10 - 200 ký tự):
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 10 ký tự an toàn"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                required
                minLength={10}
                maxLength={200}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Xác nhận lại mật khẩu mới:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại chính xác mật khẩu trên"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                required
                minLength={10}
                maxLength={200}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isLoading ? 'Đang băm PBKDF2 và cập nhật...' : 'Xác nhận Đổi mật khẩu & Kích hoạt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
