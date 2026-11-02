/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hộp thoại Quản lý Tài khoản Cá nhân (Profile Settings)
 * Dành riêng cho Quản trị viên (Admin) và Tình nguyện viên (Volunteer)
 * - Cập nhật họ tên, số điện thoại, đơn vị
 * - Ranh giới cứng: Tên đăng nhập / Email gốc chỉ đọc (Read-only), tuyệt đối không sửa đổi
 * - Đổi mật khẩu có xác thực mật khẩu hiện tại, băm PBKDF2-SHA256 100 000 vòng, độ dài 10-200 ký tự
 */

import React, { useState } from 'react';
import { UserContext } from '../types';
import { apiClient } from '../services/apiClient';
import {
  User,
  Lock,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserContext;
  sessionToken: string;
  onUserUpdated: (updatedUser: UserContext) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  sessionToken,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Form profile
  const [fullName, setFullName] = useState<string>(currentUser.fullName || '');
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [organization, setOrganization] = useState<string>(currentUser.organization || '');

  // Form password
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Cập nhật thông tin cá nhân
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await apiClient.request({
        method: 'POST',
        path: '/profile',
        body: {
          fullName,
          phone,
          organization,
        },
      });

      if (response.status === 200) {
        setStatusMessage({ type: 'success', text: response.body.message || 'Cập nhật thông tin thành công!' });
        onUserUpdated(response.body.user);
      } else {
        setStatusMessage({ type: 'error', text: response.body.error || 'Cập nhật thất bại.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lỗi khi gửi yêu cầu.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Đổi mật khẩu bảo mật
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    if (newPassword.length < 10 || newPassword.length > 200) {
      setStatusMessage({
        type: 'error',
        text: 'Mật khẩu mới phải có độ dài từ 10 đến 200 ký tự theo Quy tắc nghiệp vụ 4.13.',
      });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.request({
        method: 'POST',
        path: '/profile/password',
        body: {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      });

      if (response.status === 200) {
        setStatusMessage({ type: 'success', text: response.body.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onUserUpdated(response.body.user);
      } else {
        setStatusMessage({ type: 'error', text: response.body.error || 'Đổi mật khẩu thất bại.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lỗi hệ thống khi đổi mật khẩu.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-900 text-[11px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                {currentUser.role === 'admin' ? 'Quản trị viên' : 'Tình nguyện viên'}
              </span>
              {currentUser.mustChange === 1 && (
                <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded">
                  Chờ đổi mật khẩu lần đầu
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">
              Quản lý Tài khoản Cá nhân
            </h3>
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`min-h-[40px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'profile'
                ? 'bg-white text-purple-950 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 text-purple-600" />
            <span>Thông tin cá nhân</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setStatusMessage(null);
            }}
            className={`min-h-[40px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'password'
                ? 'bg-white text-purple-950 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* TAB 1: THÔNG TIN CÁ NHÂN */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Tên đăng nhập (READ-ONLY / DISABLED) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  Tên đăng nhập (Email định danh):
                </label>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Chỉ đọc (Read-only)
                </span>
              </div>
              <input
                type="text"
                value={currentUser.email}
                disabled
                readOnly
                className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-xl text-xs sm:text-sm font-mono text-gray-600 cursor-not-allowed select-none font-semibold"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Ranh giới cứng bảo mật: Tên đăng nhập gốc không thể sửa đổi dưới mọi hình thức để đảm bảo tính toàn vẹn phiên và nhật ký kiểm toán.
              </p>
            </div>

            {/* Họ và tên */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Họ và tên hiển thị:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-500" /> Số điện thoại liên lạc:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0905 123 456"
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Đơn vị công tác */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-gray-500" /> Đơn vị / Tổ công tác:
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Ví dụ: Tổ TNV Chuyển đổi số Phường An Hải Bắc"
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Thông báo */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] py-2.5 px-4 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {isLoading ? 'Đang lưu thông tin...' : 'Lưu Thay đổi Hồ sơ'}
            </button>
          </form>
        )}

        {/* TAB 2: ĐỔI MẬT KHẨU BẢO MẬT */}
        {activeTab === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <strong className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Tiêu chuẩn an ninh mật khẩu:
              </strong>
              <p>
                Áp dụng thuật toán băm <strong>PBKDF2-SHA256 với 100.000 vòng lặp</strong>. Độ dài mật khẩu mới bắt buộc từ <strong>10 đến 200 ký tự</strong> (Quy tắc 4.13).
              </p>
            </div>

            {/* Mật khẩu hiện tại */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu hiện tại:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu bạn đang sử dụng"
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mật khẩu mới (10 - 200 ký tự):
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 10 ký tự an toàn"
                minLength={10}
                maxLength={200}
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Xác nhận mật khẩu mới:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại chính xác mật khẩu mới"
                minLength={10}
                maxLength={200}
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* Thông báo */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {isLoading ? 'Đang băm PBKDF2 100 000 vòng...' : 'Xác nhận Đổi Mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
