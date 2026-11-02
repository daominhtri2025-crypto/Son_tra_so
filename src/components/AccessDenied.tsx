/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Màn hình Chặn truy cập (403 Forbidden / 401 Unauthorized)
 * Ngăn chặn truy cập chéo vai trò giữa Học viên, Tình nguyện viên và Quản trị viên
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, UserX } from 'lucide-react';
import { Role } from '../types';

interface AccessDeniedProps {
  currentRole: Role;
  targetRole: Role | 'admin' | 'volunteer' | 'learner';
  reason: string;
  onReturnToAllowed: () => void;
  onSwitchAccount: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentRole,
  targetRole,
  reason,
  onReturnToAllowed,
  onSwitchAccount,
}) => {
  const roleNames: Record<string, string> = {
    learner: 'Học viên (Learner)',
    volunteer: 'Tình nguyện viên (Volunteer)',
    admin: 'Quản trị viên (Admin)',
  };

  return (
    <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl border-2 border-rose-300 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
      <div className="w-20 h-20 bg-rose-100 text-rose-700 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="bg-rose-100 text-rose-800 text-xs font-black uppercase px-3 py-1 rounded-full font-mono">
          HTTP 403 FORBIDDEN — TRUY CẬP BỊ TỪ CHỐI
        </span>
        <h2 className="text-2xl font-black text-gray-900">
          Bạn không có quyền truy cập vào phân hệ này
        </h2>
        <p className="text-sm text-gray-600 max-w-lg mx-auto">
          Hệ thống bảo mật Sơn Trà Số đã kích hoạt rào chắn phân quyền nghiêm ngặt nhằm bảo vệ dữ liệu và ngăn ngừa leo thang đặc quyền (Privilege Escalation).
        </p>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left text-xs sm:text-sm text-rose-950 space-y-2">
        <div className="flex items-center gap-2 font-bold text-rose-900">
          <Lock className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Lý do từ chối truy cập:</span>
        </div>
        <p className="font-medium pl-6">{reason}</p>
        <div className="pt-2 border-t border-rose-200/80 flex flex-wrap justify-between text-xs text-rose-800">
          <span>Vai trò phiên hiện tại: <strong>{roleNames[currentRole] || currentRole}</strong></span>
          <span>Phân hệ yêu cầu: <strong>{roleNames[targetRole] || targetRole}</strong></span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onReturnToAllowed}
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Trở về phân hệ được cấp phép ({roleNames[currentRole]})
        </button>

        <button
          type="button"
          onClick={onSwitchAccount}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition"
        >
          <UserX className="w-4 h-4" />
          Đăng xuất / Chuyển tài khoản
        </button>
      </div>
    </div>
  );
};
