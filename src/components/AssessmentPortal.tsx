/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Phân hệ Tình nguyện viên: Ghi phiếu quan sát năng lực số học viên tại cơ sở (Trước - Sau)
 * Tình nguyện viên KHÔNG tự đăng ký tài khoản (Quản lý bởi Admin).
 * Tuyệt đối không được xem dashboard tổng hợp hay quản lý tài khoản.
 */

import React, { useState } from 'react';
import { Assessment, AssessmentScores, Learner, Account } from '../types';
import { formatUtcPlus7 } from '../utils/rules';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldAlert,
  Send,
  HelpCircle,
  MapPin,
  ClipboardList,
  Search,
  Building,
} from 'lucide-react';

interface AssessmentPortalProps {
  assessments: Assessment[];
  onAddAssessment: (newAssessment: Assessment) => void;
  learners: Learner[];
  accounts: Account[];
  staffEmails: string[];
  onOpenProfileSettings?: () => void;
  isLargeFont: boolean;
}

const STANDARD_TASKS = [
  {
    id: 'task1' as keyof AssessmentScores,
    title: 'Nhiệm vụ 1: Sử dụng thiết bị cơ bản & Kết nối',
    desc: 'Chỉnh cỡ chữ to dễ nhìn, khóa xoay màn hình, bật/tắt Wifi và 4G khi ra chợ.',
  },
  {
    id: 'task2' as keyof AssessmentScores,
    title: 'Nhiệm vụ 2: Tra cứu thông tin & Dịch vụ công Sơn Trà',
    desc: 'Vào cổng sontra.danang.gov.vn, biết số Tổng đài dịch vụ công 1022 Đà Nẵng.',
  },
  {
    id: 'task3' as keyof AssessmentScores,
    title: 'Nhiệm vụ 3: Giao tiếp & Mạng xã hội an toàn',
    desc: 'Nhận thông báo nhóm Zalo tổ dân phố, gọi video cho người thân, chặn tin nhắn rác.',
  },
  {
    id: 'task4' as keyof AssessmentScores,
    title: 'Nhiệm vụ 4: Thanh toán số & Tiện ích dân sinh',
    desc: 'Quét mã QR mua bán tại chợ dân sinh Sơn Trà, tra cứu và nộp tiền điện nước.',
  },
  {
    id: 'task5' as keyof AssessmentScores,
    title: 'Nhiệm vụ 5: Tự bảo vệ & Phòng chống lừa đảo số',
    desc: 'Nhận diện cuộc gọi giả danh công an, tuyệt đối giữ kín mã OTP, không ấn link lạ.',
  },
];

const COMMUNITY_LOCATIONS = [
  'Tổ dân phố 12, P. An Hải Bắc (Nhà văn hóa)',
  'Tổ dân phố 15, P. An Hải Tây (Điểm sinh hoạt TDP)',
  'Nhà văn hóa P. Phước Mỹ, Q. Sơn Trà',
  'Nhà sinh hoạt cộng đồng P. Mân Thái (Đường Trương Hán Siêu)',
  'Điểm hỗ trợ kỹ năng số P. Nại Hiên Đông (UBND Phường)',
  'Chợ An Hải Bắc - Khu vực quét mã QR',
];

export const AssessmentPortal: React.FC<AssessmentPortalProps> = ({
  assessments,
  onAddAssessment,
  learners,
  accounts,
  staffEmails,
  onOpenProfileSettings,
  isLargeFont,
}) => {
  // Tình nguyện viên hiện tại đang thao tác
  const [currentVolunteerEmail, setCurrentVolunteerEmail] = useState<string>('tnv.lethikim@sontra.edu.vn');
  const [selectedLearner, setSelectedLearner] = useState<string>(learners[0]?.id || 'lrn-001');
  const [phase, setPhase] = useState<'pre' | 'post'>('pre');
  const [location, setLocation] = useState<string>(COMMUNITY_LOCATIONS[0]);
  const [notes, setNotes] = useState<string>('');

  // Điểm số 5 nhiệm vụ: null nghĩa là "chưa đánh giá" (Quy tắc 4.2)
  const [scores, setScores] = useState<AssessmentScores>({
    task1: null,
    task2: null,
    task3: null,
    task4: null,
    task5: null,
  });

  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  // Kiểm tra điều kiện Tình nguyện viên theo Quy tắc 4.12
  const currentAccount = accounts.find((a) => a.email === currentVolunteerEmail);
  const isEmailInStaff = staffEmails.includes(currentVolunteerEmail);
  const isAccountActive = currentAccount?.active === 1;
  const hasMustChangeFlag = currentAccount?.must_change === 1;

  const isEligibleToAssess = isEmailInStaff && isAccountActive && !hasMustChangeFlag;

  const handleScoreChange = (taskKey: keyof AssessmentScores, val: number | null) => {
    setScores((prev) => ({
      ...prev,
      [taskKey]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEligibleToAssess) return;

    // Tạo client_id cho idempotency (Quy tắc 4.3)
    const clientId = `client-asm-${selectedLearner}-${phase}-${Date.now()}`;
    const newAsm: Assessment = {
      id: `asm-${Date.now()}`,
      learner: selectedLearner,
      phase,
      scores: { ...scores },
      assessor: currentVolunteerEmail,
      location,
      notes: notes.trim() || undefined,
      created: new Date().toISOString(),
      client_id: clientId,
    };

    onAddAssessment(newAsm);
    setSubmitStatus('Đã ghi nhận phiếu quan sát thành công!');
    setTimeout(() => setSubmitStatus(null), 4000);

    // Reset form điểm về null ("chưa đánh giá")
    setScores({
      task1: null,
      task2: null,
      task3: null,
      task4: null,
      task5: null,
    });
    setNotes('');
  };

  return (
    <div className={`space-y-6 ${isLargeFont ? 'text-lg' : 'text-base'}`}>
      {/* Banner chức năng & Kiểm tra điều kiện TNV */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase font-mono">
                Cổng Tình nguyện viên Cơ sở
              </span>
              <span className="text-xs text-gray-500 font-mono">Quy tắc 4.2 & 4.12</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
              Ghi nhận Phiếu Quan sát Năng lực số Thực địa
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              Dành cho Tình nguyện viên xuống trực tiếp tổ dân phố, chợ dân sinh và nhà văn hóa phường để đánh giá năng lực số cho bà con.
            </p>
          </div>

          {/* Chọn tài khoản TNV để kiểm thử quy tắc phân quyền */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 min-w-[280px]">
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Tài khoản TNV đang trực ban:
            </label>
            <select
              value={currentVolunteerEmail}
              onChange={(e) => setCurrentVolunteerEmail(e.target.value)}
              className="w-full text-xs font-semibold p-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {accounts
                .filter((a) => a.role === 'volunteer' || a.role === 'admin')
                .map((acc) => (
                  <option key={acc.id} value={acc.email}>
                    {acc.full_name} ({acc.role}) {acc.active === 0 ? '[Bị vô hiệu hóa]' : ''} {acc.must_change ? '[must_change]' : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Cảnh báo vi phạm Quy tắc 4.12 nếu có */}
        {!isEligibleToAssess && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold">
                Quy tắc 4.12: Tình nguyện viên chưa đủ điều kiện ghi phiếu quan sát!
              </p>
              <ul className="list-disc pl-5 text-xs space-y-0.5 text-rose-700">
                {!isEmailInStaff && <li>Email không nằm trong danh bạ nhân sự 'staff' do Quản trị viên cấp.</li>}
                {!isAccountActive && <li>Tài khoản đang ở trạng thái bị vô hiệu hóa (active = 0) do đã hết hạn đợt tình nguyện.</li>}
                {hasMustChangeFlag && (
                  <li className="font-bold text-amber-800">
                    Tài khoản có cờ <strong>must_change = 1</strong> (buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên trước khi được ghi phiếu theo FR-AUTH-07).
                  </li>
                )}
              </ul>
              {hasMustChangeFlag && onOpenProfileSettings && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenProfileSettings}
                    className="min-h-[40px] px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    Đổi mật khẩu ngay để kích hoạt tài khoản
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Form nhập phiếu quan sát */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              1. Chọn Học viên quan sát:
            </label>
            <select
              value={selectedLearner}
              onChange={(e) => setSelectedLearner(e.target.value)}
              className="w-full min-h-[44px] p-2.5 border border-gray-300 rounded-xl bg-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              {learners.map((lrn) => (
                <option key={lrn.id} value={lrn.id}>
                  {lrn.code} - {lrn.full_name || lrn.email || 'Học viên'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              2. Giai đoạn đo lường:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`min-h-[44px] p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer font-bold text-xs sm:text-sm transition ${
                  phase === 'pre'
                    ? 'bg-amber-100 border-amber-600 text-amber-900 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="phase"
                  value="pre"
                  checked={phase === 'pre'}
                  onChange={() => setPhase('pre')}
                  className="sr-only"
                />
                <span>Trước khóa (Pre)</span>
              </label>

              <label
                className={`min-h-[44px] p-2.5 rounded-xl border flex items-center justify-center gap-2 cursor-pointer font-bold text-xs sm:text-sm transition ${
                  phase === 'post'
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-900 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="phase"
                  value="post"
                  checked={phase === 'post'}
                  onChange={() => setPhase('post')}
                  className="sr-only"
                />
                <span>Sau khóa (Post)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              3. Cơ sở đánh giá trực tiếp:
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full min-h-[44px] p-2.5 border border-gray-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
            >
              {COMMUNITY_LOCATIONS.map((loc, idx) => (
                <option key={idx} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 5 Chuẩn Nhiệm vụ Năng lực số */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-700" />
              Đánh giá thực nghiệm 5 nhiệm vụ năng lực số chuẩn
            </h3>
            <span className="text-xs text-gray-500 font-mono">Thang điểm 1 - 5</span>
          </div>

          {/* Lời nhắc Quy tắc 4.2 */}
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Quy tắc nghiệp vụ 4.2:</strong> Nếu học viên chưa làm hoặc TNV chưa kiểm tra nhiệm vụ nào, chọn <strong>"Chưa đánh giá" (null)</strong>. Hệ thống giữ nguyên giá trị null, không được tự động chuyển thành 0.
            </span>
          </div>

          <div className="space-y-3">
            {STANDARD_TASKS.map((task) => {
              const currentVal = scores[task.id];
              return (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                        {task.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5">{task.desc}</p>
                    </div>

                    <div className="text-xs font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto bg-white border border-gray-200">
                      {currentVal === null ? (
                        <span className="text-gray-500 italic">Chưa đánh giá (null)</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Điểm: {currentVal} / 5</span>
                      )}
                    </div>
                  </div>

                  {/* Buttons for 1..5 and null (Min 44x44px for accessibility) */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => handleScoreChange(task.id, null)}
                      className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold border transition ${
                        currentVal === null
                          ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Chưa đánh giá (null)
                    </button>

                    {[1, 2, 3, 4, 5].map((scoreNum) => (
                      <button
                        key={scoreNum}
                        type="button"
                        onClick={() => handleScoreChange(task.id, scoreNum)}
                        className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-sm font-bold border transition ${
                          currentVal === scoreNum
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-emerald-50'
                        }`}
                      >
                        {scoreNum}
                      </button>
                    ))}

                    <span className="text-xs text-gray-500 ml-2 hidden sm:inline">
                      (1: Chưa làm được - 5: Tự thao tác rất tốt)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Ghi chú thêm của Tình nguyện viên tại cơ sở:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Bác đã nắm chắc cách quét mã QR, thao tác nhanh nhẹn..."
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Nút gửi phiếu */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <button
            type="submit"
            disabled={!isEligibleToAssess}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2 shadow-md transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Send className="w-4 h-4" />
            Lưu phiếu quan sát (Idempotent theo Quy tắc 4.3)
          </button>

          {submitStatus && (
            <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              {submitStatus}
            </div>
          )}
        </div>
      </form>

      {/* Lịch sử các phiếu quan sát đã ghi */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-700" />
            Nhật ký phiếu quan sát đã lưu ({assessments.length} phiếu)
          </h3>
          <span className="text-xs text-gray-500 font-mono">Chuẩn UTC+7</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/80">
                <th className="py-2.5 px-3">Học viên</th>
                <th className="py-2.5 px-3">Giai đoạn</th>
                <th className="py-2.5 px-3">Điểm 5 nhiệm vụ (T1..T5)</th>
                <th className="py-2.5 px-3">Địa điểm cơ sở</th>
                <th className="py-2.5 px-3">Người đánh giá</th>
                <th className="py-2.5 px-3">Thời gian ghi (UTC+7)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assessments.map((asm) => (
                <tr key={asm.id} className="hover:bg-gray-50/60">
                  <td className="py-2.5 px-3 font-bold text-gray-900">
                    {asm.learner}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        asm.phase === 'pre'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {asm.phase === 'pre' ? 'Trước khóa (Pre)' : 'Sau khóa (Post)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs">
                    T1:{asm.scores.task1 ?? 'null'} | T2:{asm.scores.task2 ?? 'null'} | T3:
                    {asm.scores.task3 ?? 'null'} | T4:{asm.scores.task4 ?? 'null'} | T5:
                    {asm.scores.task5 ?? 'null'}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 truncate max-w-[160px]">
                    {asm.location || 'Tổ dân phố Sơn Trà'}
                  </td>
                  <td className="py-2.5 px-3 text-gray-600 truncate max-w-[150px]">
                    {asm.assessor}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 font-mono text-xs">
                    {formatUtcPlus7(asm.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
