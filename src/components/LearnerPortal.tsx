/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Phân hệ học viên: Danh sách bài học tối ưu UX/UI (Grid thẻ + Hộp chọn nhanh),
 * hỗ trợ người cao tuổi với vùng chạm >= 44x44px, cuộn mượt (Smooth Scroll)
 * và phân loại trạng thái học tập rõ ràng theo 5 nhóm nhiệm vụ chuyển đổi số Sơn Trà.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Lesson, LearnerProgress, NewsItem, AnswerResult } from '../types';
import { GROUPS_META } from '../data/groups';
import { calculateQuizPassStatus, mergeProgress } from '../utils/rules';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Award,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Newspaper,
  AlertCircle,
  HelpCircle,
  Search,
  Smartphone,
  Landmark,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  Check,
  Volume2,
  VolumeX,
  Headphones,
  FileVideo,
  FileAudio,
  Video,
} from 'lucide-react';

import { UserContext } from '../types';
import { NewsDetailModal } from './NewsDetailModal';

interface LearnerPortalProps {
  currentUser?: UserContext | null;
  lessons: Lesson[];
  progress: LearnerProgress[];
  onUpdateProgress: (updated: LearnerProgress) => void;
  onSubmitAnswer: (lessonNo: number, choice: number) => Promise<AnswerResult | null>;
  news: NewsItem[];
  focusLessonNo?: number | null;
  isLargeFont: boolean;
}

export const LearnerPortal: React.FC<LearnerPortalProps> = ({
  currentUser,
  lessons,
  progress,
  onUpdateProgress,
  onSubmitAnswer,
  news,
  focusLessonNo,
  isLargeFont,
}) => {
  const currentLearnerId = currentUser?.id || 'lrn-001';
  const learnerCode = currentUser?.code || 'ST-HV-001';

  const [openNews, setOpenNews] = useState<NewsItem | null>(null);
  // Drawer danh sách bài trên điện thoại (không ảnh hưởng bố cục máy tính)
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  // Các nhóm bài đang mở (accordion); mặc định tất cả thu gọn
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);

  // Bộ lọc
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bài học đang chọn
  const [selectedLessonId, setSelectedLessonId] = useState<number>(0);

  // Mở đúng bài học được chọn từ nút trên trang chủ
  useEffect(() => {
    if (focusLessonNo !== null && focusLessonNo !== undefined) setSelectedLessonId(focusLessonNo);
  }, [focusLessonNo]);

  // Quiz state
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string; explanation: string } | null>(null);

  const lessonViewerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Helper chuyển đổi URL YouTube sang link Embed an toàn
  // Hỗ trợ: youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID (kể cả m.youtube.com)
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
      let id: string | null = null;
      if (host === 'youtu.be') {
        id = parsed.pathname.slice(1).split('/')[0];
      } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        if (parsed.pathname === '/watch') {
          id = parsed.searchParams.get('v');
        } else {
          const m = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
          id = m ? m[1] : null;
        }
      }
      // ID YouTube dài đúng 11 ký tự gồm chữ, số, "-" và "_"; chặn mọi giá trị khác trước khi nhúng.
      return id && /^[A-Za-z0-9_-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    } catch {
      return null;
    }
  };

  // Helper kiểm tra tệp video phát trực tiếp
  const isDirectVideo = (url?: string, type?: 'url' | 'file') => {
    if (!url) return false;
    if (type === 'file') return true;
    const lower = url.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.startsWith('data:video/') ||
      lower.startsWith('blob:')
    );
  };

  // Điều chỉnh tốc độ phát âm thanh
  const handleSetSpeed = (speed: number) => {
    setAudioSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Trợ lý đọc to bài học bằng giọng nói tiếng Việt (Web Speech API)
  const handleToggleTTS = (lessonToRead: Lesson) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Trình duyệt hiện tại chưa hỗ trợ bộ tổng hợp giọng nói tiếng Việt.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const text = `${lessonToRead.title}. Nhóm nhiệm vụ số ${lessonToRead.group_no}. ${lessonToRead.body.replace(/\n+/g, '. ')}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Lọc bài học hợp lệ: chưa bị xóa mềm (deleted_at null) và đang hiển thị (hidden === 0)
  const visibleLessons = lessons.filter((l) => l.hidden === 0 && !l.deleted_at);

  // Helper tính trạng thái học của một bài
  const getLessonStatus = (lessonId: number) => {
    const p = progress.find((item) => item.lesson === lessonId && item.learner === currentLearnerId);
    const isDone = p?.done === 1;
    const isScorePass = p?.score === 1;
    const isRead = p?.read === 1;

    if (isDone || isScorePass) {
      return {
        key: 'completed' as const,
        label: isScorePass ? 'Đã đạt quiz & Hoàn thành' : 'Đã bấm hoàn thành',
        shortLabel: 'Đã hoàn thành',
        cardBorder: 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-500',
        badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
      };
    }
    if (isRead) {
      return {
        key: 'in_progress' as const,
        label: 'Đang học dở (Đã đọc)',
        shortLabel: 'Đang học',
        cardBorder: 'border-amber-300 bg-amber-50/70 hover:border-amber-500',
        badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
        icon: Clock,
        iconColor: 'text-amber-600',
      };
    }
    return {
      key: 'not_started' as const,
      label: 'Chưa học',
      shortLabel: 'Chưa học',
      cardBorder: 'border-gray-200 bg-white hover:border-emerald-300',
      badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
      icon: BookOpen,
      iconColor: 'text-gray-400',
    };
  };

  // Lọc danh sách bài học
  const filteredLessons = visibleLessons.filter((l) => {
    const matchesGroup = selectedGroup === null || l.group_no === selectedGroup;
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.body.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesGroup || !matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const status = getLessonStatus(l.lesson);
    return status.key === statusFilter;
  });

  const activeLesson = visibleLessons.find((l) => l.lesson === selectedLessonId) || visibleLessons[0];
  const activeProgress = progress.find((p) => p.lesson === activeLesson?.lesson && p.learner === currentLearnerId);

  // Tính trạng thái đạt theo Quy tắc 4.17 (ngưỡng 70% số bài đang hiện)
  const quizPassStatus = calculateQuizPassStatus(
    lessons,
    progress.filter((p) => p.learner === currentLearnerId)
  );

  // Cuộn mượt đến khối nội dung bài học
  const scrollToLessonContent = () => {
    if (lessonViewerRef.current) {
      lessonViewerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const el = document.getElementById('active-lesson-viewer');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Chọn bài học và tự động cuộn
  const handleSelectLesson = (lessonId: number, shouldScroll: boolean = true) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setSelectedLessonId(lessonId);
    setSelectedChoice(null);
    setQuizSubmitted(false);
    setFeedback(null);

    // Ghi nhận hành vi "Đã đọc" (read = 1) theo Quy tắc 4.1
    const merged = mergeProgress(
      progress.find((p) => p.lesson === lessonId && p.learner === currentLearnerId),
      { learner: currentLearnerId, lesson: lessonId, read: 1 }
    );
    onUpdateProgress(merged);

    if (shouldScroll) {
      setTimeout(() => {
        scrollToLessonContent();
      }, 50);
    }
  };

  // Hoàn thành bài học
  const handleCompleteLesson = () => {
    if (!activeLesson) return;
    const current = progress.find((p) => p.lesson === activeLesson.lesson && p.learner === currentLearnerId);
    const updated = mergeProgress(current, {
      learner: currentLearnerId,
      lesson: activeLesson.lesson,
      read: 1,
      done: 1,
    });
    onUpdateProgress(updated);
  };

  // Nộp câu hỏi trắc nghiệm: máy chủ chấm và ghi điểm (Quy tắc 4.1, 4.17)
  const handleSubmitQuiz = async () => {
    if (!activeLesson || selectedChoice === null) return;
    const result = await onSubmitAnswer(activeLesson.lesson, selectedChoice);
    if (!result) return;
    setQuizSubmitted(true);
    setFeedback({
      isCorrect: result.correct,
      text: result.correct
        ? 'Chính xác! Bác đã nắm rất vững kiến thức cốt lõi của bài học.'
        : `Chưa đúng rồi ạ. Đáp án đúng là đáp án số ${result.correctChoice + 1}. Bác cùng đọc lại phần giải thích bên dưới nhé.`,
      explanation: result.explanation,
    });
  };

  // Điều hướng bài kế tiếp / bài trước
  const currentIndex = visibleLessons.findIndex((l) => l.lesson === activeLesson?.lesson);
  const prevLesson = currentIndex > 0 ? visibleLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < visibleLessons.length - 1 ? visibleLessons[currentIndex + 1] : null;

  // Biểu tượng đại diện theo 5 nhóm nhiệm vụ
  const renderGroupIcon = (groupId: number, className: string = 'w-5 h-5') => {
    switch (groupId) {
      case 1:
        return <Smartphone className={className} />;
      case 2:
        return <Landmark className={className} />;
      case 3:
        return <MessageSquare className={className} />;
      case 4:
        return <CreditCard className={className} />;
      case 5:
        return <ShieldCheck className={className} />;
      default:
        return <BookOpen className={className} />;
    }
  };

  // Thống kê hiển thị ở cột trái
  const completedLessonCount = visibleLessons.filter((l) => getLessonStatus(l.lesson).key === 'completed').length;
  const passThresholdCount = Math.ceil(quizPassStatus.visibleLessonCount * 0.7);
  const passNeededCount = Math.max(0, passThresholdCount - quizPassStatus.passedLessonCount);
  // Màn hình hẹp (dưới lg): danh sách là drawer, chọn bài xong thì cuộn xuống nội dung
  const isNarrowScreen = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

  // Nhóm nào đang mở: người dùng bấm tiêu đề để mở/đóng; khi tìm kiếm hoặc chọn một nhóm thì tự mở nhóm liên quan
  const visibleGroupIds = GROUPS_META.filter((g) => filteredLessons.some((l) => l.group_no === g.id)).map((g) => g.id);
  const allVisibleGroupsOpen = visibleGroupIds.length > 0 && visibleGroupIds.every((id) => expandedGroups.includes(id));
  const isGroupOpen = (groupId: number) => expandedGroups.includes(groupId);
  const toggleGroup = (groupId: number) =>
    setExpandedGroups((prev) => (prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]));
  const toggleAllGroups = () => setExpandedGroups(allVisibleGroupsOpen ? [] : visibleGroupIds);

  useEffect(() => {
    if (searchQuery.trim() !== '') setExpandedGroups(visibleGroupIds);
    else if (selectedGroup !== null) setExpandedGroups([selectedGroup]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedGroup]);

  return (
    <div className={`space-y-6 max-w-full overflow-x-hidden ${isLargeFont ? 'text-lg' : 'text-base'}`}>
      {/* BỐ CỤC HAI CỘT: cột trái gồm tiến độ, tìm kiếm và danh sách bài (drawer trên điện thoại); cột phải là nội dung bài học */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 lg:sticky lg:top-4 space-y-3 min-w-0">
          {/* Tiến độ: rút gọn, luôn hiển thị ở đầu cột trái */}
          <div className="bg-white rounded-2xl border border-emerald-300 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-gray-800 flex items-center gap-1.5 text-sm">
                <Award className="w-4 h-4 text-amber-500" />
                Tiến độ của bạn
              </span>
              <span className="text-[11px] font-mono font-bold text-gray-500">Ngưỡng 70%</span>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-black text-emerald-800 tabular-nums">
                {quizPassStatus.passedLessonCount} / {quizPassStatus.visibleLessonCount}
              </span>
              <span className="text-sm font-semibold text-gray-600">bài đạt quiz ({quizPassStatus.percentage}%)</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  quizPassStatus.isPassed ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, quizPassStatus.percentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
              <span>
                Đã hoàn thành: <strong className="text-gray-900">{completedLessonCount}</strong> / {visibleLessons.length} bài
              </span>
              <span>
                Còn lại: <strong className="text-gray-900">{visibleLessons.length - completedLessonCount}</strong> bài
              </span>
            </div>

            <p className="text-xs font-medium">
              {!quizPassStatus.hasAttempts ? (
                <span className="text-gray-500">Chưa có kết quả quiz. Bác hãy bấm vào từng bài để đọc và làm trắc nghiệm.</span>
              ) : quizPassStatus.isPassed ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Đã đạt chuẩn kỹ năng số cộng đồng (≥70%)
                </span>
              ) : (
                <span className="text-amber-700">Cần đạt thêm {passNeededCount} bài trắc nghiệm nữa để hoàn thành.</span>
              )}
            </p>

            <p className="text-[11px] text-gray-500 font-mono truncate">
              Mã học viên: {learnerCode}
              {currentUser?.fullName ? ` · ${currentUser.fullName}` : ''}
            </p>
          </div>

          {/* Nút mở danh sách bài: chỉ hiện trên điện thoại */}
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-expanded={drawerOpen}
            aria-controls="lesson-drawer"
            className="lg:hidden w-full min-h-[52px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-between px-4 shadow-sm"
          >
            <span>☰ Bài học</span>
            <span className="text-sm font-mono">{drawerOpen ? 'Đóng ▲' : `${filteredLessons.length} bài ▼`}</span>
          </button>

          <div
            id="lesson-drawer"
            className={`${drawerOpen ? 'block' : 'hidden'} lg:block bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 space-y-3`}
          >
            {/* Tìm kiếm */}
            <div>
              <label htmlFor="lesson-search" className="sr-only">Tìm bài học</label>
              <input
                id="lesson-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên hoặc nội dung bài học…"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Bộ lọc dạng combo box (tiết kiệm diện tích, dễ thao tác trên điện thoại) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label htmlFor="lesson-status-filter" className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Trạng thái
                </label>
                <select
                  id="lesson-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'in_progress' | 'not_started')}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="in_progress">Đang học</option>
                  <option value="not_started">Chưa học</option>
                </select>
              </div>

              <div className="min-w-0">
                <label htmlFor="lesson-group-filter" className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Nhóm nhiệm vụ
                </label>
                <select
                  id="lesson-group-filter"
                  value={selectedGroup === null ? 'all' : String(selectedGroup)}
                  onChange={(e) => setSelectedGroup(e.target.value === 'all' ? null : Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate"
                >
                  <option value="all">Tất cả nhóm</option>
                  {GROUPS_META.map((grp) => (
                    <option key={grp.id} value={String(grp.id)}>
                      Nhóm {grp.id}: {grp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thanh điều khiển accordion */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Danh sách bài học</span>
              <button
                type="button"
                onClick={toggleAllGroups}
                disabled={visibleGroupIds.length === 0}
                className="min-h-[32px] px-2.5 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                {allVisibleGroupsOpen ? 'Thu gọn tất cả' : 'Mở tất cả'}
              </button>
            </div>

            {/* Danh sách bài học: accordion theo nhóm nhiệm vụ, mặc định thu gọn */}
            <div className="space-y-2 lg:max-h-[calc(100vh-24rem)] lg:overflow-y-auto pr-1">
              {filteredLessons.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Không tìm thấy bài học phù hợp. Bác thử chọn "Tất cả" hoặc xóa từ khóa tìm kiếm.
                </div>
              ) : (
                GROUPS_META.map((grp) => {
                  const items = filteredLessons.filter((l) => l.group_no === grp.id);
                  if (items.length === 0) return null;
                  const doneInGroup = items.filter((l) => getLessonStatus(l.lesson).key === 'completed').length;
                  const isOpen = isGroupOpen(grp.id);
                  const panelId = `lesson-group-panel-${grp.id}`;

                  return (
                    <div key={grp.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => toggleGroup(grp.id)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="w-full flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                      >
                        {renderGroupIcon(grp.id, 'w-4 h-4 text-emerald-800 shrink-0')}
                        <span className="font-bold text-xs sm:text-sm text-emerald-950 truncate flex-1">
                          Nhóm {grp.id}: {grp.name}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-800 shrink-0">
                          {doneInGroup}/{items.length}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-emerald-800 shrink-0 transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Nội dung trượt xuống/lên nhờ chuyển đổi grid-template-rows; khi thu gọn thì không thể tab tới */}
                      <div
                        id={panelId}
                        inert={!isOpen}
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                      >
                        <div className="overflow-hidden min-h-0">
                          <ul className="divide-y divide-gray-100 px-1">
                            {items.map((l) => {
                              const st = getLessonStatus(l.lesson);
                              const isCurrent = activeLesson?.lesson === l.lesson;
                              const StatusIcon = st.icon;

                              return (
                                <li key={l.lesson}>
                                  <button
                                    type="button"
                                    aria-current={isCurrent ? 'true' : undefined}
                                    onClick={() => {
                                      setDrawerOpen(false);
                                      handleSelectLesson(l.lesson, isNarrowScreen());
                                    }}
                                    className={`w-full text-left p-3 my-1 rounded-xl flex items-start gap-3 min-h-[56px] transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                      isCurrent ? 'bg-emerald-50 ring-2 ring-emerald-600' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <StatusIcon className={`w-5 h-5 shrink-0 mt-0.5 ${st.iconColor}`} />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-snug line-clamp-2">
                                        #{l.lesson}. {l.title}
                                      </h4>
                                      <span className={`inline-block mt-1 text-[11px] font-bold px-1.5 py-0.5 rounded ${st.badgeClass}`}>
                                        {st.shortLabel}
                                      </span>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Cột phải: nội dung bài học hiển thị ngay */}
        <div className="lg:col-span-8 min-w-0">
      {/* 5. KHỐI NỘI DUNG BÀI HỌC CHI TIẾT (ACTIVE LESSON VIEWER) */}
      <section
        id="active-lesson-viewer"
        ref={lessonViewerRef}
        className="scroll-mt-24 pt-2"
      >
        {activeLesson ? (
          <article className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
            {/* Header bài học */}
            <div className="border-b border-gray-100 pb-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  {renderGroupIcon(activeLesson.group_no, 'w-4 h-4')}
                  Nhóm {activeLesson.group_no}: {GROUPS_META.find((g) => g.id === activeLesson.group_no)?.name}
                </span>
                <span className="text-xs text-gray-500 font-mono font-bold bg-gray-100 px-2.5 py-1 rounded-md">
                  Mã bài học: #{activeLesson.lesson}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug">
                {activeLesson.title}
              </h3>

              {/* Dòng trạng thái tiến độ 3 mục */}
              <div className="flex items-center gap-3 pt-1 text-xs sm:text-sm text-gray-600 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2
                    className={`w-4 h-4 ${activeProgress?.read ? 'text-emerald-600' : 'text-gray-300'}`}
                  />
                  {activeProgress?.read ? 'Đã xem nội dung' : 'Chưa đọc'}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2
                    className={`w-4 h-4 ${activeProgress?.done ? 'text-emerald-600' : 'text-gray-300'}`}
                  />
                  {activeProgress?.done ? 'Đã bấm hoàn thành' : 'Chưa bấm hoàn thành'}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Award
                    className={`w-4 h-4 ${activeProgress?.score ? 'text-amber-500' : 'text-gray-300'}`}
                  />
                  {activeProgress?.score ? 'Đã vượt qua câu hỏi trắc nghiệm' : 'Chưa làm trắc nghiệm'}
                </span>
              </div>
            </div>

            {/* 1. Trình phát âm thanh Đọc bài học (Audio Narration) */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-base sm:text-lg text-purple-950 flex items-center gap-2 flex-wrap">
                      <span>Âm thanh Đọc bài học</span>
                      {activeLesson.audio_url && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                          {activeLesson.audio_filename ? `Tệp: ${activeLesson.audio_filename}` : 'Bản thu âm'}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-800">
                      Hỗ trợ người cao tuổi mắt kém hoặc muốn vừa nghe hướng dẫn vừa thao tác trên điện thoại.
                    </p>
                  </div>
                </div>

                {/* Nút bấm Trợ lý đọc to bằng giọng nói tiếng Việt */}
                <button
                  type="button"
                  onClick={() => handleToggleTTS(activeLesson)}
                  className={`min-h-[46px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm self-start sm:self-auto cursor-pointer ${
                    isSpeaking
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-white text-purple-900 border border-purple-300 hover:bg-purple-100'
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-purple-700" />}
                  <span>{isSpeaking ? 'Dừng đọc bài' : 'Đọc to bài học (Giọng Việt)'}</span>
                </button>
              </div>

              {/* Trình phát file âm thanh thu âm chính thức (nếu có) */}
              {activeLesson.audio_url && (
                <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 text-purple-900 font-bold">
                      <FileAudio className="w-4 h-4 text-purple-600" />
                      Trình phát âm thanh thu âm:
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 font-medium">Tốc độ:</span>
                      {[0.8, 1.0, 1.2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleSetSpeed(spd)}
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                            audioSpeed === spd
                              ? 'bg-purple-700 text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={`Tốc độ đọc ${spd}x`}
                        >
                          {spd}x {spd === 0.8 ? '(Chậm)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    controls
                    src={activeLesson.audio_url}
                    className="w-full h-11 rounded-xl focus:outline-none"
                  >
                    Trình duyệt của bác không hỗ trợ nghe âm thanh.
                  </audio>
                </div>
              )}
            </div>

            {/* Nội dung bài học (Định dạng từng bước, cỡ chữ to rõ cho người cao tuổi) */}
            <div className="space-y-4 text-gray-900 leading-relaxed font-normal">
              {activeLesson.body.split('\n\n').map((paragraph, idx) => (
                <div
                  key={idx}
                  className="whitespace-pre-line bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 text-base sm:text-lg"
                >
                  {paragraph}
                </div>
              ))}
            </div>

            {/* Bước thực hành tiếp theo */}
            {activeLesson.next_step && (
              <div className="bg-amber-50/80 border border-amber-200 p-4 sm:p-5 rounded-2xl space-y-1">
                <h5 className="font-bold text-amber-950 text-sm sm:text-base flex items-center gap-1.5">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  Thực hành ngay sau bài học:
                </h5>
                <p className="text-sm sm:text-base text-amber-900 leading-relaxed pl-6">
                  {activeLesson.next_step}
                </p>
              </div>
            )}

            {/* KHUNG VIDEO BÀI HỌC (ĐẶT Ở CUỐI NỘI DUNG BÀI HỌC, TRƯỚC PHẦN TRẮC NGHIỆM) */}
            {activeLesson.video_url && activeLesson.video_url.trim() !== '' ? (
              /* Trường hợp 1: Bài học CÓ đính kèm video */
              <div className="bg-gray-50 rounded-3xl p-4 sm:p-6 border border-gray-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-gray-900">
                    <PlayCircle className="w-6 h-6 text-red-600 shrink-0" />
                    <span>Video thực hành hướng dẫn trực quan</span>
                    {activeLesson.video_filename && (
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-800 flex items-center gap-1">
                        <FileVideo className="w-3.5 h-3.5" /> {activeLesson.video_filename}
                      </span>
                    )}
                  </div>

                  {activeLesson.video_url.includes('youtube') && (
                    <a
                      href={activeLesson.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm text-red-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Mở trên YouTube <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-600">
                  Video hướng dẫn thao tác thực tế từng bước trên màn hình điện thoại thông minh.
                </p>

                {/* Trình phát Video Player phù hợp theo định dạng */}
                <div className="pt-1">
                  {isDirectVideo(activeLesson.video_url, activeLesson.video_type) ? (
                    <div className="rounded-2xl overflow-hidden bg-black shadow-md border border-gray-300">
                      <video
                        controls
                        className="w-full aspect-video max-h-[480px] object-contain"
                        src={activeLesson.video_url}
                      >
                        Trình duyệt không hỗ trợ xem video trực tiếp.
                      </video>
                    </div>
                  ) : getYouTubeEmbedUrl(activeLesson.video_url) ? (
                    <div className="rounded-2xl overflow-hidden bg-black shadow-md border border-gray-300 aspect-video max-h-[480px]">
                      <iframe
                        className="w-full h-full"
                        src={getYouTubeEmbedUrl(activeLesson.video_url)!}
                        title={activeLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">Nguồn video trực tuyến:</span>
                        <span className="text-sm font-mono text-gray-800 break-all">{activeLesson.video_url}</span>
                      </div>
                      <a
                        href={activeLesson.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm shrink-0"
                      >
                        <PlayCircle className="w-4 h-4" /> Mở video bài giảng <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Trường hợp 2: Bài học KHÔNG CÓ video -> Hiển thị khối tiêu đề kèm dòng thông báo chuẩn */
              <div className="bg-slate-50/90 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-3xl p-5 sm:p-6 transition shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <Video className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <Clock className="w-3.5 h-3.5" /> Video thực hành
                      </div>
                      <h5 className="font-bold text-base sm:text-lg text-gray-800 leading-snug">
                        {activeLesson.title} <span className="text-gray-400 mx-1.5 font-normal">|</span> <span className="text-amber-700 font-semibold">Video thực hành đang được update</span>
                      </h5>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-gray-500 leading-relaxed pl-0 sm:pl-[62px]">
                  Ban biên tập Tình nguyện viên Sơn Trà đang chuẩn bị video thao tác thực hành mẫu cho bài học này. Bác vui lòng đọc kỹ hướng dẫn từng bước phía trên hoặc bấm nút nghe đọc bài học.
                </p>
              </div>
            )}

            {/* Nút bấm Hoàn thành bài học (Quy tắc 4.1: max từng trường, done không bị hạ) */}
            <div className="pt-2 flex items-center justify-between border-t border-gray-100 flex-wrap gap-4">
              <button
                type="button"
                onClick={handleCompleteLesson}
                className={`min-h-[48px] px-6 py-3 rounded-xl font-bold text-base flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                  activeProgress?.done === 1
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                {activeProgress?.done === 1
                  ? 'Bác đã bấm hoàn thành bài học này'
                  : 'Bác đã hiểu và hoàn thành bài'}
              </button>

              <span className="text-xs text-gray-500 font-medium">
                (Tiến độ được tự động lưu trữ và đồng bộ hóa)
              </span>
            </div>

            {/* 6. ĐIỀU HƯỚNG LIỀN MẠCH BÀI TRƯỚC / BÀI TIẾP THEO (UX THÂN THIỆN) */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              {prevLesson ? (
                <button
                  type="button"
                  onClick={() => handleSelectLesson(prevLesson.lesson, true)}
                  className="w-full sm:w-auto min-h-[48px] px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                  <span>Bài trước (#{prevLesson.lesson})</span>
                </button>
              ) : (
                <div className="hidden sm:block" />
              )}

              <span className="text-xs text-gray-500 font-medium">
                Bài {currentIndex + 1} / {visibleLessons.length}
              </span>

              {nextLesson ? (
                <button
                  type="button"
                  onClick={() => handleSelectLesson(nextLesson.lesson, true)}
                  className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                >
                  <span>Bài tiếp theo (#{nextLesson.lesson})</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-2 rounded-xl">
                  Bác đã đến bài học cuối cùng!
                </div>
              )}
            </div>

            {/* 7. CÂU HỎI TRẮC NGHIỆM KIỂM TRA HIỂU BÀI (IDEMPOTENT THEO QUY TẮC 4.3 & 4.17) */}
            <div className="mt-8 pt-6 border-t-2 border-emerald-100 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-black text-xl text-emerald-950 flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-emerald-700" />
                  Câu hỏi trắc nghiệm kiểm tra hiểu bài
                </h4>
              </div>

              <div className="bg-emerald-50/70 p-5 sm:p-6 rounded-2xl border border-emerald-200 space-y-4">
                <p className="font-bold text-gray-900 text-base sm:text-lg leading-snug">
                  {activeLesson.quiz.question}
                </p>

                <div className="space-y-2.5">
                  {activeLesson.quiz.options.map((opt, optIdx) => (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition min-h-[48px] ${
                        selectedChoice === optIdx
                          ? 'bg-emerald-100 border-emerald-600 font-bold text-emerald-950 shadow-xs'
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${activeLesson.lesson}`}
                        checked={selectedChoice === optIdx}
                        onChange={() => setSelectedChoice(optIdx)}
                        className="mt-1 w-5 h-5 text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <span className="text-base sm:text-lg leading-snug">{opt}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap pt-2">
                  <button
                    type="button"
                    disabled={selectedChoice === null}
                    onClick={handleSubmitQuiz}
                    className="min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-base transition focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
                  >
                    Nộp câu trả lời
                  </button>

                  {quizSubmitted && feedback && (
                    <div
                      className={`p-4 rounded-xl text-sm sm:text-base flex items-start gap-2.5 max-w-lg ${
                        feedback.isCorrect
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                      }`}
                    >
                      {feedback.isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-black text-base">{feedback.text}</p>
                        <p className="text-xs sm:text-sm mt-1.5 text-gray-800 font-normal leading-relaxed">
                          {feedback.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500">
            Vui lòng chọn một bài học trong danh sách bên trái.
          </div>
        )}
      </section>
        </div>
      </div>


      {/* 8. BẢN TIN CHUYỂN ĐỔI SỐ SƠN TRÀ */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl sm:text-2xl text-gray-900 flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-emerald-700" />
            Tin nổi bật
          </h3>
          <a
            href="https://sontra.danang.gov.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
          >
            sontra.danang.gov.vn
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {news
            .filter((n) => n.hidden === 0)
            .map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-gray-200 bg-white hover:border-emerald-300 transition shadow-sm flex flex-col justify-between overflow-hidden"
              >
                {item.image_url && (
                  <div className="h-44 w-full bg-gray-100 overflow-hidden relative">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="bg-emerald-800/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                        {item.source === 'sontra_gov' ? 'sontra.danang.gov.vn' : 'Bản tin chính thức'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-2.5 flex-1">
                  {!item.image_url && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md inline-block">
                      {item.source === 'sontra_gov' ? 'Cổng TTĐT Sơn Trà' : 'Thông báo chính thức'}
                    </span>
                  )}
                  <h4 className="font-bold text-gray-900 text-base sm:text-lg leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="p-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono">Nguồn: UBND phường Sơn Trà</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOpenNews(item)}
                      className="min-h-[44px] px-3 py-2 text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      Đọc bài viết <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:underline min-h-[44px] flex items-center"
                      >
                        Trang nguồn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
        {openNews && <NewsDetailModal item={openNews} onClose={() => setOpenNews(null)} />}
      </section>
    </div>
  );
};
