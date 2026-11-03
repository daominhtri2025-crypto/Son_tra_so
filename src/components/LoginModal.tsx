/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hộp thoại Đăng nhập & Đăng ký phân quyền cho Sơn Trà Số
 * Hỗ trợ:
 * - Học viên: Google OAuth2 / OpenID Connect + Đăng ký / Đăng nhập Email & Mật khẩu (PBKDF2)
 * - Tình nguyện viên: Đăng nhập tài khoản do Admin cấp (không tự đăng ký)
 * - Quản trị viên: Quản trị hệ thống toàn diện
 */

import React, { useState } from 'react';
import { GoogleSignInButton, GOOGLE_SIGNIN_ENABLED } from './GoogleSignInButton';
import { ForgotPasswordForm } from './PasswordResetModal';
import { Role } from '../types';
import { apiClient } from '../services/apiClient';
import { UserContext } from '../types';
import {
  Lock,
  Mail,
  User,
  Shield,
  BookOpen,
  UserCheck,
  AlertCircle,
  X,
  KeyRound,
  UserPlus,
  CheckCircle,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserContext) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<Role>('learner');
  const [learnerAuthMode, setLearnerAuthMode] = useState<'google' | 'login' | 'register'>(GOOGLE_SIGNIN_ENABLED ? 'google' : 'login');

  // Form states - để trống để người dùng tự nhập
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showForgot, setShowForgot] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTabChange = (role: Role) => {
    setActiveTab(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  // 1. Đăng nhập Google: gửi ID token cho máy chủ để xác minh (không tự khai danh tính)
  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.request({ method: 'POST', path: '/auth/google', body: { credential } });
      if (response.status === 200) {
        setSuccessMessage('Đăng nhập qua Google thành công! Đang chuyển hướng...');
        setTimeout(() => {
          onLoginSuccess(response.body.user);
          onClose();
        }, 800);
      } else {
        setErrorMessage(response.body.error || 'Xác thực Google thất bại.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối dịch vụ Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Đăng ký Học viên mới qua Email/Password
  const handleRegisterLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.request({
        method: 'POST',
        path: '/auth/register',
        body: { email, password, fullName },
      });

      if (response.status === 201) {
        setSuccessMessage('Đăng ký tài khoản học viên thành công!');
        setTimeout(() => {
          onLoginSuccess(response.body.user);
          onClose();
        }, 800);
      } else {
        setErrorMessage(response.body.error || 'Đăng ký không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống khi đăng ký.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Đăng nhập bằng email và mật khẩu
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.request({
        method: 'POST',
        path: '/auth/login',
        body: { email, password },
      });

      if (response.status === 200) {
        onLoginSuccess(response.body.user);
        onClose();
      } else {
        setErrorMessage(response.body.error || 'Đăng nhập không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ.');
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

        {/* Tiêu đề */}
        <div>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase font-mono">
            Hệ thống Định danh Sơn Trà Số
          </span>
          <h3 className="text-2xl font-black text-gray-900 mt-1">
            Đăng nhập / Đăng ký Tài khoản
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Chọn đúng vai trò và phương thức xác thực để truy cập phân hệ được cấp quyền.
          </p>
        </div>

        {/* Chọn vai trò */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => handleTabChange('learner')}
            className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'learner'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Học viên</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('volunteer')}
            className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'volunteer'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Tình nguyện viên</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition ${
              activeTab === 'admin'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Quản trị viên</span>
          </button>
        </div>

        {/* PHÂN HỆ HỌC VIÊN: HỖ TRỢ XÁC THỰC KÉP */}
        {activeTab === 'learner' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-xs font-bold text-gray-500">
              {GOOGLE_SIGNIN_ENABLED && (
                <>
                  <button
                    type="button"
                    onClick={() => setLearnerAuthMode('google')}
                    className={`pb-1 transition ${
                      learnerAuthMode === 'google'
                        ? 'text-emerald-700 border-b-2 border-emerald-600'
                        : 'hover:text-gray-800'
                    }`}
                  >
                    Tài khoản Google
                  </button>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <button
                type="button"
                onClick={() => setLearnerAuthMode('login')}
                className={`pb-1 transition ${
                  learnerAuthMode === 'login'
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'hover:text-gray-800'
                }`}
              >
                Đăng nhập Email / Mã số
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setLearnerAuthMode('register')}
                className={`pb-1 transition ${
                  learnerAuthMode === 'register'
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'hover:text-gray-800'
                }`}
              >
                Đăng ký tài khoản mới
              </button>
            </div>

            {/* Chế độ 1: Google Identity Services (máy chủ xác minh ID token) */}
            {learnerAuthMode === 'google' && (
              <div className="space-y-4 py-2">
                <p className="text-xs text-gray-600 text-center">
                  Đăng nhập bằng tài khoản Google. Máy chủ xác minh tài khoản với Google và tự tạo hồ sơ học viên ở lần đầu.
                </p>
                <GoogleSignInButton onCredential={handleGoogleCredential} onError={setErrorMessage} />
              </div>
            )}

            {/* Chế độ 2: Đăng nhập bằng email và mật khẩu */}
            {learnerAuthMode === 'login' && showForgot && <ForgotPasswordForm onBack={() => setShowForgot(false)} />}

            {learnerAuthMode === 'login' && !showForgot && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Đăng nhập
                </button>
                <button type="button" onClick={() => setShowForgot(true)} className="w-full text-xs font-semibold text-emerald-800 underline">
                  Quên mật khẩu?
                </button>
              </form>
            )}

            {/* Chế độ 3: Đăng ký tài khoản Học viên mới */}
            {learnerAuthMode === 'register' && (
              <form onSubmit={handleRegisterLearner} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Họ và tên học viên:</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Bác Trần Văn Nam"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Địa chỉ Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mật khẩu (10 - 200 ký tự - PBKDF2 100k vòng):
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 10 ký tự an toàn"
                    minLength={10}
                    maxLength={200}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Hoàn tất Đăng ký & Vào học ngay
                </button>
              </form>
            )}
          </div>
        )}

        {/* PHÂN HỆ TÌNH NGUYỆN VIÊN (QUẢN LÝ BỞI ADMIN) */}
        {activeTab === 'volunteer' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>Lưu ý bảo mật:</strong> Tình nguyện viên <em>KHÔNG tự đăng ký</em> tài khoản. Toàn bộ tài khoản tình nguyện viên do Quản trị viên cấp phát trực tiếp.
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email tình nguyện viên:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                Đăng nhập Cổng Tình nguyện viên
              </button>
            </form>
          </div>
        )}

        {/* PHÂN HỆ QUẢN TRỊ VIÊN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Quản trị viên:</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu Quản trị:</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Shield className="w-4 h-4" />
              Đăng nhập Cổng Quản trị viên
            </button>
          </form>
        )}

        {/* Thông báo lỗi / thành công */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
