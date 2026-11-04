/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ứng dụng Sơn Trà Số — Nền tảng Chuyển đổi số và Nâng cao năng lực số Sơn Trà, Đà Nẵng
 * Trạng thái ứng dụng được nạp từ máy chủ (API /api). Giao diện không giữ dữ liệu mẫu hay mật khẩu.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Role, Lesson, LessonVersion, LearnerProgress, Assessment, NewsItem, Account, Learner, UserContext, AnswerResult, HeroSlide } from './types';
import { PasswordResetModal } from './components/PasswordResetModal';
import { Header } from './components/Header';
import { LearnerPortal } from './components/LearnerPortal';
import { AssessmentPortal } from './components/AssessmentPortal';
import { AdminPortal } from './components/AdminPortal';
import { AccessDenied } from './components/AccessDenied';
import { LoginModal } from './components/LoginModal';
import { ForcedChangePasswordModal } from './components/ForcedChangePasswordModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { WelcomeLanding } from './components/WelcomeLanding';
import { apiClient } from './services/apiClient';
import { Heart, AlertCircle, CheckCircle2, X } from 'lucide-react';

/** Phiên đăng nhập nằm trong cookie HttpOnly; giao diện chỉ cần biết là đang có phiên. */
const SESSION_ACTIVE = 'server-session';

type Notice = { type: 'success' | 'error'; text: string } | null;

/** Chuyển bản ghi tài khoản quản trị (camelCase) sang kiểu Account dùng trong giao diện. */
function toAccount(u: any): Account {
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    role: u.role,
    auth_provider: u.authProvider,
    avatar_url: u.avatarUrl ?? undefined,
    phone: u.phone ?? undefined,
    organization: u.organization ?? undefined,
    active: u.active,
    must_change: u.mustChange,
    failed_attempts: 0,
    locked_until: u.lockedUntil ?? null,
    created: u.createdAt ?? '',
    updated: u.createdAt ?? '',
  };
}

/** Thay phần tử có cùng khóa, hoặc thêm lên đầu danh sách nếu chưa có. */
function upsertBy<T, K extends keyof T>(list: T[], item: T, key: K): T[] {
  return list.some((x) => x[key] === item[key])
    ? list.map((x) => (x[key] === item[key] ? item : x))
    : [item, ...list];
}

/** Tệp do giao diện đọc thành data URL được tải lên máy chủ trước khi lưu bài học. */
async function resolveMedia(
  kind: 'video' | 'audio',
  url: string | undefined,
  filename: string | undefined
): Promise<{ url?: string; filename?: string }> {
  if (!url || !url.startsWith('data:')) return { url, filename };
  const blob = await (await fetch(url)).blob();
  const up = await apiClient.uploadMedia(kind, blob, filename || (kind === 'video' ? 'video.mp4' : 'audio.mp3'));
  if (up.status !== 201) throw new Error(up.body.error || 'Tải tệp lên thất bại.');
  return { url: up.body.url, filename: up.body.filename };
}

async function lessonPayload(lesson: Partial<Lesson>): Promise<Record<string, unknown>> {
  const video = await resolveMedia('video', lesson.video_url, lesson.video_filename);
  const audio = await resolveMedia('audio', lesson.audio_url, lesson.audio_filename);
  return {
    title: lesson.title,
    group_no: lesson.group_no,
    body: lesson.body,
    quiz: lesson.quiz,
    next_step: lesson.next_step ?? null,
    video_url: video.url ?? null,
    video_filename: video.filename ?? null,
    audio_url: audio.url ?? null,
    audio_filename: audio.filename ?? null,
    hidden: lesson.hidden ?? 0,
  };
}

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('learner');
  const [isLargeFont, setIsLargeFont] = useState<boolean>(false);
  const [bootstrapped, setBootstrapped] = useState<boolean>(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Liên kết khôi phục có dạng /?reset=<token>. Lấy token rồi xóa khỏi thanh địa chỉ để không lưu vào lịch sử.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token && /^[0-9a-f]{64}$/.test(token)) {
      setResetToken(token);
    }
    if (params.has('reset')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<UserContext | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState<boolean>(false);
  const [deniedAttempt, setDeniedAttempt] = useState<{ targetRole: Role; reason: string } | null>(null);

  // Dữ liệu công khai
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);

  // Dữ liệu riêng theo vai trò (rỗng khi chưa đăng nhập)
  const [lessonVersions, setLessonVersions] = useState<LessonVersion[]>([]);
  const [progress, setProgress] = useState<LearnerProgress[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);

  const sessionToken = currentUser ? SESSION_ACTIVE : null;
  const staffEmails = useMemo(
    () => accounts.filter((a) => a.role === 'volunteer').map((a) => a.email),
    [accounts]
  );

  const flash = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 6000);
  }, []);

  const roleFor = (user: UserContext): Role =>
    user.role === 'admin' ? 'admin' : user.role === 'volunteer' ? 'volunteer' : 'learner';

  /** Nạp dữ liệu riêng theo vai trò sau khi đăng nhập hoặc khi tải lại trang. */
  const loadPrivateData = useCallback(async (user: UserContext) => {
    if (user.role === 'learner') {
      const res = await apiClient.request<{ progress: LearnerProgress[] }>({ method: 'GET', path: '/progress' });
      if (res.status === 200) setProgress(res.body.progress);
    }
    if (user.role === 'volunteer' || user.role === 'admin') {
      const [asm, lrn] = await Promise.all([
        apiClient.request<{ assessments: Assessment[] }>({ method: 'GET', path: '/assessments' }),
        apiClient.request<{ learners: Learner[] }>({ method: 'GET', path: '/learners' }),
      ]);
      if (asm.status === 200) setAssessments(asm.body.assessments);
      if (lrn.status === 200) setLearners(lrn.body.learners);
    }
    if (user.role === 'admin') {
      const [users, prog, versions] = await Promise.all([
        apiClient.request<{ users: any[]; learners: Learner[] }>({ method: 'GET', path: '/admin/users' }),
        apiClient.request<{ progress: LearnerProgress[] }>({ method: 'GET', path: '/admin/progress' }),
        apiClient.request<{ versions: LessonVersion[] }>({ method: 'GET', path: '/admin/lesson-versions' }),
      ]);
      if (users.status === 200) {
        setAccounts(users.body.users.map(toAccount));
        setLearners(users.body.learners);
      }
      if (prog.status === 200) setProgress(prog.body.progress);
      if (versions.status === 200) setLessonVersions(versions.body.versions);
    }
  }, []);

  const applyUser = useCallback(
    async (user: UserContext) => {
      setCurrentUser(user);
      setCurrentRole(roleFor(user));
      setDeniedAttempt(null);
      await loadPrivateData(user);
    },
    [loadPrivateData]
  );

  const clearPrivateData = () => {
    setProgress([]);
    setAssessments([]);
    setAccounts([]);
    setLearners([]);
    setLessonVersions([]);
  };

  // Khởi động: nạp nội dung công khai và kiểm tra phiên hiện có trên máy chủ
  useEffect(() => {
    (async () => {
      const [me, ls, ns, hs] = await Promise.all([
        apiClient.request<{ authenticated: boolean; user?: UserContext }>({ method: 'GET', path: '/me' }),
        apiClient.request<{ lessons: Lesson[] }>({ method: 'GET', path: '/lessons' }),
        apiClient.request<{ news: NewsItem[] }>({ method: 'GET', path: '/news' }),
        apiClient.request<{ slides: HeroSlide[] }>({ method: 'GET', path: '/hero-slides' }),
      ]);
      if (ls.status === 200) setLessons(ls.body.lessons);
      if (ns.status === 200) setNews(ns.body.news);
      if (hs.status === 200) setHeroSlides(hs.body.slides);
      if (me.status === 200 && me.body.authenticated && me.body.user) {
        await applyUser(me.body.user);
      }
      setBootstrapped(true);
    })();
  }, [applyUser]);

  const handleSelectRole = (requestedRole: Role) => {
    setDeniedAttempt(null);
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (requestedRole === 'admin' && currentUser.role !== 'admin') {
      setDeniedAttempt({
        targetRole: 'admin',
        reason:
          currentUser.role === 'volunteer'
            ? 'Tình nguyện viên không có quyền truy cập vào phân hệ Quản trị viên và không được xem dashboard tổng hợp (Quy tắc nghiệp vụ 4.8).'
            : 'Học viên không có quyền truy cập vào phân hệ Quản trị viên.',
      });
      return;
    }
    if (requestedRole === 'volunteer' && currentUser.role !== 'volunteer' && currentUser.role !== 'admin') {
      setDeniedAttempt({
        targetRole: 'volunteer',
        reason: 'Học viên chỉ có quyền xem bài học và theo dõi tiến độ cá nhân của chính mình.',
      });
      return;
    }
    setCurrentRole(requestedRole);
  };

  const handleLoginSuccess = async (user: UserContext) => {
    await applyUser(user);
    const [ls, ns] = await Promise.all([
      apiClient.request<{ lessons: Lesson[] }>({ method: 'GET', path: '/lessons' }),
      apiClient.request<{ news: NewsItem[] }>({ method: 'GET', path: '/news' }),
    ]);
    if (ls.status === 200) setLessons(ls.body.lessons);
    if (ns.status === 200) setNews(ns.body.news);
  };

  const handleLogout = async () => {
    await apiClient.request({ method: 'POST', path: '/auth/logout', body: {} });
    setCurrentUser(null);
    setDeniedAttempt(null);
    clearPrivateData();
    setCurrentRole('learner');
  };

  // ---------------------------------------------------------------- Học viên
  const handleUpdateProgress = async (updated: LearnerProgress) => {
    const res = await apiClient.request<{ progress: LearnerProgress }>({
      method: 'PUT',
      path: '/progress',
      body: { lesson: updated.lesson, read: updated.read, done: updated.done, score: updated.score },
    });
    if (res.status === 200) {
      setProgress((prev) => {
        const others = prev.filter((p) => !(p.learner === res.body.progress.learner && p.lesson === res.body.progress.lesson));
        return [...others, res.body.progress];
      });
    } else {
      flash('error', res.body.error || 'Không lưu được tiến độ học tập.');
    }
  };

  const handleSubmitAnswer = async (lessonNo: number, choice: number): Promise<AnswerResult | null> => {
    const res = await apiClient.request<AnswerResult & { progress: LearnerProgress }>({
      method: 'POST',
      path: `/lessons/${lessonNo}/answer`,
      body: { choice },
    });
    if (res.status !== 200) {
      flash('error', res.body.error || 'Không chấm được câu trả lời.');
      return null;
    }
    const saved = res.body.progress;
    setProgress((prev) => [
      ...prev.filter((p) => !(p.learner === saved.learner && p.lesson === saved.lesson)),
      saved,
    ]);
    return { correct: res.body.correct, correctChoice: res.body.correctChoice, explanation: res.body.explanation };
  };

  // ---------------------------------------------------------- Tình nguyện viên
  const handleAddAssessment = async (asm: Assessment) => {
    const res = await apiClient.request<{ assessment: Assessment }>({
      method: 'POST',
      path: '/assessments',
      body: {
        learner: asm.learner,
        phase: asm.phase,
        scores: asm.scores,
        location: asm.location ?? null,
        notes: asm.notes ?? null,
        clientId: asm.client_id,
      },
    });
    if (res.status === 200 || res.status === 201) {
      setAssessments((prev) => upsertBy(prev, res.body.assessment, 'id'));
      if (res.status === 201) flash('success', 'Đã lưu phiếu quan sát.');
    } else {
      flash('error', res.body.error || 'Không lưu được phiếu quan sát.');
    }
  };

  // ---------------------------------------------------------------- Quản trị
  const handleAddLesson = async (lesson: Lesson) => {
    try {
      const res = await apiClient.request<{ lesson: Lesson }>({ method: 'POST', path: '/admin/lessons', body: await lessonPayload(lesson) });
      if (res.status === 201) {
        setLessons((prev) => upsertBy(prev, res.body.lesson, 'lesson'));
        flash('success', `Đã tạo bài học #${res.body.lesson.lesson}.`);
      } else flash('error', res.body.error || 'Không tạo được bài học.');
    } catch (e: any) {
      flash('error', e.message);
    }
  };

  const handleUpdateLesson = async (lesson: Lesson) => {
    try {
      const res = await apiClient.request<{ lesson: Lesson }>({
        method: 'PUT',
        path: `/admin/lessons/${lesson.lesson}`,
        body: await lessonPayload(lesson),
      });
      if (res.status === 200) {
        setLessons((prev) => upsertBy(prev, res.body.lesson, 'lesson'));
        const versions = await apiClient.request<{ versions: LessonVersion[] }>({ method: 'GET', path: '/admin/lesson-versions' });
        if (versions.status === 200) setLessonVersions(versions.body.versions);
        flash('success', 'Đã cập nhật bài học (bản cũ đã lưu vào lịch sử).');
      } else flash('error', res.body.error || 'Không cập nhật được bài học.');
    } catch (e: any) {
      flash('error', e.message);
    }
  };

  const applyLessonAction = async (method: 'POST' | 'DELETE', path: string, okText: string) => {
    const res = await apiClient.request<{ lesson: Lesson }>({ method, path, body: method === 'POST' ? {} : undefined });
    if (res.status === 200) {
      setLessons((prev) => upsertBy(prev, res.body.lesson, 'lesson'));
      flash('success', okText);
    } else flash('error', res.body.error || 'Thao tác không thành công.');
  };

  const handleToggleLessonVisibility = (lessonId: number) =>
    applyLessonAction('POST', `/admin/lessons/${lessonId}/toggle`, 'Đã đổi trạng thái ẩn/hiện.');
  const handleSoftDeleteLesson = (lessonId: number) =>
    applyLessonAction('DELETE', `/admin/lessons/${lessonId}`, 'Đã xóa mềm bài học (vẫn giữ lịch sử).');
  const handleRestoreLesson = (lessonId: number) =>
    applyLessonAction('POST', `/admin/lessons/${lessonId}/restore`, 'Đã khôi phục bài học.');

  const handleAddVolunteer = async (data: {
    email: string;
    fullName: string;
    initialPassword: string;
    phone?: string;
    organization?: string;
  }) => {
    const res = await apiClient.request<{ volunteer: any }>({
      method: 'POST',
      path: '/admin/volunteers',
      body: data,
    });
    if (res.status !== 201) throw new Error(res.body.error || 'Không tạo được tài khoản tình nguyện viên.');
    setAccounts((prev) => [toAccount(res.body.volunteer), ...prev]);
  };

  const updateAccountOnServer = async (accountId: string, body: Record<string, unknown>) => {
    const res = await apiClient.request<{ account: any }>({ method: 'PUT', path: `/admin/accounts/${accountId}`, body });
    if (res.status === 200) {
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? toAccount(res.body.account) : a)));
    } else flash('error', res.body.error || 'Không cập nhật được tài khoản.');
  };

  const handleToggleAccountActive = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) void updateAccountOnServer(accountId, { active: acc.active !== 1 });
  };

  const handleResetAccountMustChange = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) void updateAccountOnServer(accountId, { mustChange: acc.must_change !== 1 });
  };

  const handleToggleNewsVisibility = async (id: number) => {
    const res = await apiClient.request<{ news: NewsItem }>({ method: 'POST', path: `/admin/news/${id}/toggle`, body: {} });
    if (res.status === 200) setNews((prev) => upsertBy(prev, res.body.news, 'id'));
    else flash('error', res.body.error || 'Không đổi được trạng thái bài viết.');
  };

  const handleAddNews = async (item: NewsItem) => {
    const res = await apiClient.request<{ news: NewsItem }>({
      method: 'POST',
      path: '/admin/news',
      body: {
        title: item.title,
        summary: item.summary,
        content: item.content,
        sourceUrl: item.source_url || null,
        imageUrl: item.image_url || null,
      },
    });
    if (res.status === 201) setNews((prev) => [res.body.news, ...prev]);
    else throw new Error(res.body.error || 'Không đăng được bài viết.');
  };

  const handleSyncNews = async () => {
    const res = await apiClient.request<{ items: NewsItem[]; message: string }>({ method: 'POST', path: '/admin/news/sync', body: {} });
    if (res.status === 200) {
      setNews(res.body.items);
      return res.body;
    }
    const err: Error & { status?: number } = new Error(res.body.error || 'Không thể đồng bộ tin tức từ nguồn đã cấu hình.');
    err.status = res.status;
    throw err;
  };

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col font-sans ${isLargeFont ? 'text-lg' : 'text-base'}`}>
      <Header
        currentRole={deniedAttempt ? (deniedAttempt.targetRole as Role) : currentRole}
        currentUser={currentUser}
        onSelectRole={handleSelectRole}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
        isLargeFont={isLargeFont}
        onToggleLargeFont={() => setIsLargeFont((prev) => !prev)}
      />

      {notice && (
        <div
          role="status"
          className={`max-w-7xl w-full mx-auto mt-4 px-4 flex items-start gap-2 text-sm`}
        >
          <div
            className={`flex-1 flex items-start gap-2 rounded-xl border px-4 py-3 ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {!bootstrapped ? (
          <p className="text-center text-gray-500 py-16">Đang tải dữ liệu…</p>
        ) : deniedAttempt ? (
          <AccessDenied
            currentRole={currentUser?.role || 'learner'}
            targetRole={deniedAttempt.targetRole}
            reason={deniedAttempt.reason}
            onReturnToAllowed={() => {
              setDeniedAttempt(null);
              setCurrentRole(currentUser ? roleFor(currentUser) : 'learner');
            }}
            onSwitchAccount={() => {
              setDeniedAttempt(null);
              setIsLoginModalOpen(true);
            }}
          />
        ) : !currentUser ? (
          <WelcomeLanding onLoginSuccess={handleLoginSuccess} news={news} heroSlides={heroSlides} isLargeFont={isLargeFont} />
        ) : (
          <>
            {currentRole === 'learner' && (
              <LearnerPortal
                currentUser={currentUser}
                lessons={lessons}
                progress={progress}
                onUpdateProgress={handleUpdateProgress}
                onSubmitAnswer={handleSubmitAnswer}
                news={news}
                isLargeFont={isLargeFont}
              />
            )}
            {currentRole === 'volunteer' && (
              <AssessmentPortal
                assessments={assessments}
                onAddAssessment={handleAddAssessment}
                learners={learners}
                accounts={accounts}
                staffEmails={staffEmails}
                onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
                isLargeFont={isLargeFont}
              />
            )}
            {currentRole === 'admin' && (
              <AdminPortal
                lessons={lessons}
                lessonVersions={lessonVersions}
                onAddLesson={handleAddLesson}
                onUpdateLesson={handleUpdateLesson}
                onToggleLessonVisibility={handleToggleLessonVisibility}
                onSoftDeleteLesson={handleSoftDeleteLesson}
                onRestoreLesson={handleRestoreLesson}
                progress={progress}
                assessments={assessments}
                accounts={accounts}
                onAddVolunteer={handleAddVolunteer}
                onToggleAccountActive={handleToggleAccountActive}
                onResetAccountMustChange={handleResetAccountMustChange}
                news={news}
                onAddNews={handleAddNews}
                onToggleNewsVisibility={handleToggleNewsVisibility}
                onSyncNews={handleSyncNews}
                sessionToken={sessionToken}
                learners={learners}
                isLargeFont={isLargeFont}
              />
            )}
          </>
        )}
      </main>

      {resetToken && (
        <PasswordResetModal
          token={resetToken}
          onDone={(message) => {
            setResetToken(null);
            flash('success', message);
            setIsLoginModalOpen(true);
          }}
          onClose={() => setResetToken(null)}
        />
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />

      {currentUser && currentUser.mustChange === 1 && sessionToken && (
        <ForcedChangePasswordModal
          user={currentUser}
          sessionToken={sessionToken}
          onPasswordChanged={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
        />
      )}

      {currentUser && sessionToken && (
        <ProfileSettingsModal
          isOpen={isProfileSettingsOpen}
          onClose={() => setIsProfileSettingsOpen(false)}
          currentUser={currentUser}
          sessionToken={sessionToken}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            setAccounts((prev) =>
              prev.map((a) =>
                a.id === updatedUser.id
                  ? { ...a, full_name: updatedUser.fullName, phone: updatedUser.phone ?? undefined, organization: updatedUser.organization ?? undefined, must_change: updatedUser.mustChange }
                  : a
              )
            );
          }}
        />
      )}

      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 mt-12 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div className="font-bold text-slate-200">Dự án Sơn Trà Số — Nền tảng Chuyển đổi số & An toàn An ninh Thông tin</div>
            <p className="text-slate-500 mt-0.5">
              Chủ website nghiên cứu: <strong>Mr. Phạm Phú Anh - Mr. Đào Ngọc Tuấn Anh</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Đồng hành cùng người dân phường Sơn Trà</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </footer>
    </div>
  );
}

