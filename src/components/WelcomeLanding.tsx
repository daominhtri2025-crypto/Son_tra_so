/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Trang Chào mừng & Cổng Đăng nhập/Đăng ký Sơn Trà Số (Landing / Login Page)
 * Hiển thị bắt buộc khi người dùng chưa khởi tạo phiên làm việc (hoặc sau khi đóng trình duyệt).
 * Bảo mật: Chặn bypass, phiên làm việc dùng Session Cookie thuần túy (đóng trình duyệt là xóa phiên).
 */

import React, { useState } from 'react';
import { Role, NewsItem } from '../types';
import { apiClient } from '../services/apiClient';
import { GoogleSignInButton } from './GoogleSignInButton';
import { UserContext } from '../types';
import { GROUPS_META } from '../data/groups';
import {
  Shield,
  BookOpen,
  UserCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Newspaper,
  ArrowRight,
  Info,
  PhoneCall,
} from 'lucide-react';

interface WelcomeLandingProps {
  onLoginSuccess: (user: UserContext) => void;
  news: NewsItem[];
  isLargeFont: boolean;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onLoginSuccess,
  news,
  isLargeFont,
}) => {
  const [authTab, setAuthTab] = useState<'google' | 'login' | 'register'>('google');
  const [roleMode, setRoleMode] = useState<Role>('learner');

  // Form states - để trống để người dùng nhập thông tin thật
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRoleSelect = (role: Role) => {
    setRoleMode(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  // 1. Đăng nhập Google: máy chủ xác minh ID token (không tự khai danh tính)
  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.request({ method: 'POST', path: '/auth/google', body: { credential } });
      if (response.status === 200) {
        setSuccessMessage('Đăng nhập qua tài khoản Google thành công! Đang chuyển hướng...');
        setTimeout(() => onLoginSuccess(response.body.user), 700);
      } else {
        setErrorMessage(response.body.error || 'Xác thực Google không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối dịch vụ Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email/Password hoặc Mã học viên
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
        setSuccessMessage('Xác thực danh tính thành công! Đang thiết lập phiên...');
        setTimeout(() => {
          onLoginSuccess(response.body.user);
        }, 700);
      } else {
        setErrorMessage(response.body.error || 'Đăng nhập không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Đăng ký Học viên mới
  const handleRegisterSubmit = async (e: React.FormEvent) => {
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
        setSuccessMessage('Đăng ký tài khoản học viên mới thành công!');
        setTimeout(() => {
          onLoginSuccess(response.body.user);
        }, 700);
      } else {
        setErrorMessage(response.body.error || 'Đăng ký không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi hệ thống khi đăng ký.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. HERO BANNER CHÀO MỪNG */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border-4 border-amber-400 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-bold">
            <Shield className="w-4 h-4 text-amber-400" />
            Cổng Thông tin & Quản trị Sơn Trà Số — TP. Đà Nẵng
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Nền tảng Phổ cập Kỹ năng số &amp; An toàn Thông tin cho Nhân dân Sơn Trà
          </h2>

          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Chào mừng bà con cô bác và các đồng chí đến với đề án nghiên cứu chuyển đổi số Sơn Trà Số.
            Để bảo vệ tuyệt đối dữ liệu cá nhân của học viên và tuân thủ các quy tắc bảo mật khắt khe,
            <strong> hệ thống yêu cầu xác thực danh tính để bắt đầu phiên làm việc an toàn</strong>.
          </p>

          {/* Quy chuẩn an toàn phiên làm việc */}
          <div className="bg-emerald-950/70 border border-emerald-700/80 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-emerald-200">
            <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">
                Cơ chế bảo vệ phiên làm việc an toàn (Session Cookie):
              </strong>
              Hệ thống áp dụng chuẩn Session Cookie thuần túy (HttpOnly; Secure; SameSite=Lax; Path=/).
              Ngay khi đóng trình duyệt hoặc tắt tab, toàn bộ phiên làm việc sẽ tự động xóa sạch để không lưu vết thông tin cá nhân.
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHUNG XÁC THỰC DANH TÍNH TRUNG TÂM (LOGIN / REGISTER HUB) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái: Form Đăng nhập & Đăng ký (Chiếm 7 cột) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
            <div>
              <h3 className="font-extrabold text-xl sm:text-2xl text-gray-900 flex items-center gap-2">
                <Lock className="w-6 h-6 text-emerald-700" />
                Xác thực Danh tính Người dùng
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Vui lòng chọn vai trò và phương thức xác thực để truy cập cổng làm việc.
              </p>
            </div>
          </div>

          {/* Chọn vai trò */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
              Bác hoặc đồng chí đang đăng nhập với vai trò gì?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleSelect('learner')}
                className={`min-h-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition border-2 cursor-pointer ${
                  roleMode === 'learner'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Học viên</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('volunteer')}
                className={`min-h-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition border-2 cursor-pointer ${
                  roleMode === 'volunteer'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Tình nguyện viên</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`min-h-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center gap-1 transition border-2 cursor-pointer ${
                  roleMode === 'admin'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Quản trị viên</span>
              </button>
            </div>
          </div>

          {/* Chế độ xác thực: Google OAuth / Đăng nhập / Đăng ký */}
          <div className="flex border-b border-gray-200">
            {roleMode === 'learner' && (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('google');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition ${
                  authTab === 'google'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Google OAuth2
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition ${
                authTab === 'login'
                  ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Đăng nhập truyền thống
            </button>

            {roleMode === 'learner' && (
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition ${
                  authTab === 'register'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Đăng ký tài khoản mới
              </button>
            )}
          </div>

          {/* Thông báo lỗi / thành công */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Nội dung form tương ứng */}
          {authTab === 'google' && roleMode === 'learner' && (
            <div className="space-y-4 pt-2">
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Học viên đăng nhập bằng tài khoản Google. Máy chủ xác minh tài khoản với Google và tự tạo hồ sơ học tập ở lần đầu.
              </p>
              <GoogleSignInButton onCredential={handleGoogleCredential} onError={setErrorMessage} />
            </div>
          )}

          {authTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
              <div>
                <label htmlFor="welcome-email" className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input
                  id="welcome-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="welcome-password" className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu</label>
                <input
                  id="welcome-password"
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
                className="w-full min-h-[48px] py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition"
              >
                {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>
            </form>
          )}

          {authTab === 'register' && roleMode === 'learner' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Họ và tên học viên:
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Bác Nguyễn Văn An"
                    className="w-full min-h-[46px] pl-11 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Địa chỉ Email:
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hocvien.an@gmail.com"
                    className="w-full min-h-[46px] pl-11 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mật khẩu bảo vệ (Tối thiểu 10 ký tự theo Quy tắc 4.13):
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 10 ký tự"
                    className="w-full min-h-[46px] pl-11 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Mật khẩu được băm an toàn qua PBKDF2-SHA256 với 100.000 vòng lặp.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition shadow-md cursor-pointer mt-2"
              >
                <span>{isLoading ? 'Đang đăng ký...' : 'Tạo tài khoản học viên mới'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Chân form cam kết an toàn & bảo mật */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-500 gap-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Bảo mật phiên làm việc: Session Cookie tự hủy khi đóng trình duyệt</span>
            </div>
            <span className="text-[11px] text-gray-400">Đề án Sơn Trà Số © 2026</span>
          </div>
        </div>

        {/* Cột phải: 5 Nhóm nhiệm vụ chuyển đổi số & Hỗ trợ công dân (Chiếm 5 cột) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Hỗ trợ & Đường dây nóng Chuyển đổi số */}
          <div className="bg-emerald-900 text-white rounded-3xl p-6 border border-emerald-700/80 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>Đường dây nóng Hỗ trợ Người dân Sơn Trà</span>
            </div>
            <h4 className="font-extrabold text-base sm:text-lg text-white">
              Tổng đài Dịch vụ công &amp; Hỗ trợ Số: 1022
            </h4>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Bà con cô bác cần hướng dẫn sử dụng ứng dụng hoặc phản ánh kiến nghị thủ tục hành chính, vui lòng liên hệ Tổng đài 1022 Đà Nẵng hoặc Đội hình Tình nguyện viên tại 7 phường trên địa bàn quận Sơn Trà.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-emerald-200">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-800/80 border border-emerald-600 font-mono">
                UBND quận Sơn Trà: 0236.3831.111
              </span>
            </div>
          </div>

          {/* 5 Nhóm nhiệm vụ chuyển đổi số */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-3">
            <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              5 Nhóm Nhiệm vụ Chuyển đổi số Sơn Trà
            </h4>
            <div className="space-y-2">
              {GROUPS_META.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                    {g.id}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-gray-900">{g.name}</h5>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{g.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BẢN TIN CHUYỂN ĐỔI SỐ SƠN TRÀ (CÔNG KHAI) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl sm:text-2xl text-gray-900 flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-emerald-700" />
            Bản tin Chuyển đổi số Sơn Trà - Đà Nẵng
          </h3>
          <a
            href="https://sontra.danang.gov.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
          >
            sontra.danang.gov.vn <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {news.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white hover:border-emerald-300 transition overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              {item.image_url && (
                <div className="h-40 w-full bg-gray-100 overflow-hidden relative">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="p-4 space-y-2 flex-1">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
                  {item.source === 'sontra_gov' ? 'Cổng TTĐT Sơn Trà' : 'Bản tin chính thức'}
                </span>
                <h4 className="font-bold text-sm sm:text-base text-gray-900 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-600 line-clamp-2">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
