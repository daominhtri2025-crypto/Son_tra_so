/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Thanh tiêu đề và điều hướng vai trò của Sơn Trà Số
 * Tích hợp trạng thái phiên đăng nhập, vai trò xác thực và bảo mật
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Role } from '../types';
import { UserContext } from '../types';
import {
  BookOpen,
  UserCheck,
  Shield,
  ZoomIn,
  ZoomOut,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  currentUser: UserContext | null;
  onSelectRole: (role: Role) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenProfileSettings?: () => void;
  isLargeFont: boolean;
  onToggleLargeFont: () => void;
}

const PORTAL_LABEL: Record<Role, string> = {
  learner: 'Học viên',
  volunteer: 'Tình nguyện viên',
  admin: 'Quản trị viên (Admin)',
};

/** Khi đã đăng nhập: chỉ một nút là cổng của chính tài khoản; nếu đang ở giao diện khác thì có nút quay về. */
const OwnPortalButton: React.FC<{ role: Role; currentRole: Role; onSelectRole: (r: Role) => void }> = ({
  role,
  currentRole,
  onSelectRole,
}) => {
  const isActive = currentRole === role;
  const label = isActive ? PORTAL_LABEL[role] : `Về ${PORTAL_LABEL[role]}`;
  const icon = role === 'learner' ? <BookOpen className="w-4 h-4" /> : role === 'volunteer' ? <UserCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />;
  return (
    <button
      type="button"
      onClick={() => onSelectRole(role)}
      className={`min-h-[44px] px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${
        isActive ? 'bg-amber-400 text-emerald-950 shadow' : 'bg-emerald-700/70 hover:bg-emerald-700 text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUser,
  onSelectRole,
  onOpenLogin,
  onLogout,
  onOpenProfileSettings,
  isLargeFont,
  onToggleLargeFont,
}) => {
  // Header cố định trên cùng. Khoảng giữ chỗ bằng đúng chiều cao header để nội dung không bị che.
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  // Nền header mờ 50% khi trang đã cuộn xuống; ở đầu trang nền đặc.
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const measure = () => setHeaderHeight(headerRef.current?.offsetHeight ?? 0);
    measure();
    window.addEventListener('resize', measure);
    // Chiều cao header đổi khi bật cỡ chữ to hoặc khi menu xuống dòng; đo lại để khoảng giữ chỗ khớp.
    const observer = typeof ResizeObserver !== 'undefined' && headerRef.current
      ? new ResizeObserver(measure)
      : null;
    if (observer && headerRef.current) observer.observe(headerRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" style={{ height: headerHeight }} />
      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-40 text-white shadow-md border-b-4 border-amber-400 transition-colors duration-300 ${
          isScrolled ? 'bg-emerald-800/50' : 'bg-emerald-800'
        }`}
      >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Title: bấm để về giao diện học viên (kể cả với quản trị viên, tình nguyện viên) */}
          <button
            type="button"
            onClick={() => onSelectRole('learner')}
            className="flex items-center gap-3 text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
            title="Về giao diện học viên"
            aria-label="Về giao diện học viên"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-emerald-900 flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
              ST
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  SƠN TRÀ SỐ
                </h1>
                <span className="bg-emerald-700/80 border border-emerald-500 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Đà Nẵng
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100">
                Chuyển đổi số & Phổ cập kỹ năng số cho cộng đồng phường Sơn Trà
              </p>
            </div>
          </button>

          {/* User Session & Accessibility Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* Cỡ chữ to */}
            <button
              type="button"
              onClick={onToggleLargeFont}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs sm:text-sm font-medium transition min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
              title="Phóng to hoặc thu nhỏ chữ cho người lớn tuổi"
              aria-label="Thay đổi cỡ chữ"
            >
              {isLargeFont ? (
                <ZoomOut className="w-4 h-4 text-amber-300" />
              ) : (
                <ZoomIn className="w-4 h-4 text-amber-300" />
              )}
              <span>{isLargeFont ? 'Cỡ chữ chuẩn' : 'Cỡ chữ to'}</span>
            </button>

            {/* Thông tin tài khoản & Đăng nhập/Đăng xuất */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-700 text-xs">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-300" />
                  <div className="leading-tight">
                    <div className="font-bold text-white truncate max-w-[140px]">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-emerald-200 uppercase font-mono">
                      Vai trò: {currentUser.role}
                    </div>
                  </div>
                </div>

                {(currentUser.role === 'admin' || currentUser.role === 'volunteer') && onOpenProfileSettings && (
                  <button
                    type="button"
                    onClick={onOpenProfileSettings}
                    className="min-h-[36px] px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition ml-1"
                    title="Cài đặt tài khoản & Đổi mật khẩu cá nhân"
                  >
                    <User className="w-3.5 h-3.5 text-amber-300" />
                    <span>Hồ sơ & Đổi MK</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-[36px] px-2.5 py-1 bg-rose-700/80 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition ml-1"
                  title="Đăng xuất và hủy phiên làm việc"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[44px] px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-sm transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập vai trò</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh vai trò chỉ hiện khi đã đăng nhập: cổng của tài khoản. Khách chọn vai trò ở thẻ đăng nhập trên trang. */}
        {currentUser && (
          <nav
            className="mt-3 pt-3 border-t border-emerald-700/60 flex items-center gap-1.5 overflow-x-auto pb-1"
            aria-label="Phân hệ người dùng"
          >
            <OwnPortalButton role={currentUser.role as Role} currentRole={currentRole} onSelectRole={onSelectRole} />
          </nav>
        )}
      </div>
    </header>
    </>
  );
};
