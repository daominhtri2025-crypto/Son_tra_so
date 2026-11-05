/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Phân hệ Quản trị viên (Admin Portal):
 * 1. Quản lý Tình nguyện viên (Thêm mới, Vô hiệu hóa bảo tồn lịch sử)
 * 2. Quản lý Bài học & Xóa mềm (Soft Delete bảo vệ toàn vẹn tham chiếu, lesson_versions)
 * 3. Thống kê & Báo cáo chuyên sâu:
 *    - Báo cáo tổng hợp theo 5 nhóm bài
 *    - Báo cáo kiểm tra hiểu bài từng học viên
 *    - Báo cáo đối chiếu năng lực Trước-Sau (Quy tắc 4.6)
 *    - Xuất CSV UTF-8 BOM chuẩn UTC+7
 * 4. Quản lý Bản tin Sơn Trà
 */

import React, { useEffect, useState } from 'react';
import {
  Lesson,
  LessonVersion,
  LearnerProgress,
  Assessment,
  Account,
  NewsItem,
  Learner,
} from '../types';
import {
  filterEligibleLearnersForComparison,
  exportCsvWithBom,
  formatUtcPlus7,
  calculateQuizPassStatus,
} from '../utils/rules';
import { GROUPS_META } from '../data/groups';
import { HeroSlidesAdmin } from './HeroSlidesAdmin';
import {
  BarChart3,
  BookOpen,
  Users,
  Newspaper,
  Download,
  Eye,
  EyeOff,
  Edit,
  Plus,
  History,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Save,
  CheckCircle,
  Trash2,
  RotateCcw,
  UserPlus,
  UserX,
  FileSpreadsheet,
  Award,
  Layers,
  GraduationCap,
  Search,
  Video,
  Radio,
  FileVideo,
  FileAudio,
  Headphones,
  Volume2,
  UploadCloud,
  RefreshCw,
  ExternalLink,
  Globe,
  Calendar,
  Clock,
  Sparkles,
  CheckCheck,
  Filter,
} from 'lucide-react';

/** Số mục mỗi trang khi phân trang bài học và bản tin. */
const PAGE_SIZE = 10;

interface AdminPortalProps {
  lessons: Lesson[];
  lessonVersions: LessonVersion[];
  onAddLesson: (lesson: Lesson) => void;
  onUpdateLesson: (lesson: Lesson) => void;
  onToggleLessonVisibility: (lessonId: number) => void;
  onSoftDeleteLesson: (lessonId: number) => void;
  onRestoreLesson: (lessonId: number) => void;
  progress: LearnerProgress[];
  assessments: Assessment[];
  accounts: Account[];
  onAddVolunteer: (data: {
    email: string;
    fullName: string;
    initialPassword: string;
    phone?: string;
    organization?: string;
  }) => Promise<void>;
  onToggleAccountActive: (accountId: string) => void;
  onResetAccountMustChange: (accountId: string) => void;
  news: NewsItem[];
  onAddNews: (item: NewsItem) => Promise<void>;
  onToggleNewsVisibility: (id: number) => void;
  onSyncNews?: () => Promise<any>;
  sessionToken?: string | null;
  learners: Learner[];
  isLargeFont: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  lessons,
  lessonVersions,
  onAddLesson,
  onUpdateLesson,
  onToggleLessonVisibility,
  onSoftDeleteLesson,
  onRestoreLesson,
  progress,
  assessments,
  accounts,
  onAddVolunteer,
  onToggleAccountActive,
  onResetAccountMustChange,
  news,
  onAddNews,
  onToggleNewsVisibility,
  onSyncNews,
  sessionToken,
  learners,
  isLargeFont,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'volunteers' | 'lessons' | 'news' | 'hero'>('reports');
  const [reportSubTab, setReportSubTab] = useState<'prepost' | 'groups' | 'learners'>('prepost');

  // Modal / Form thêm tình nguyện viên mới
  const [isAddVolunteerOpen, setIsAddVolunteerOpen] = useState<boolean>(false);
  const [volEmail, setVolEmail] = useState<string>('');
  const [volFullName, setVolFullName] = useState<string>('');
  const [volPassword, setVolPassword] = useState<string>('');
  const [volPhone, setVolPhone] = useState<string>('');
  const [volOrg, setVolOrg] = useState<string>('Tổ TNV Chuyển đổi số Sơn Trà');
  const [volMsg, setVolMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal / Form chỉnh sửa bài học
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState<boolean>(false);
  const [showVersionHistory, setShowVersionHistory] = useState<number | null>(null);

  // Bộ lọc danh sách bài học dành cho Admin (Khắc phục cuộn dài)
  const [lessonFilterGroup, setLessonFilterGroup] = useState<number | null>(null);
  const [lessonFilterSearch, setLessonFilterSearch] = useState<string>('');
  const [lessonFilterStatus, setLessonFilterStatus] = useState<'all' | 'active' | 'hidden' | 'deleted'>('all');

  // Form tạo bài học mới
  const [newLessonTitle, setNewLessonTitle] = useState<string>('');
  const [newLessonGroup, setNewLessonGroup] = useState<number>(1);
  const [newLessonBody, setNewLessonBody] = useState<string>('');
  const [newLessonNextStep, setNewLessonNextStep] = useState<string>('');
  const [newLessonVideoMode, setNewLessonVideoMode] = useState<'url' | 'none'>('url');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState<string>('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [newLessonAudioMode, setNewLessonAudioMode] = useState<'none' | 'url' | 'file'>('none');
  const [newLessonAudioUrl, setNewLessonAudioUrl] = useState<string>('');
  const [newLessonAudioFile, setNewLessonAudioFile] = useState<{ filename: string; dataUrl: string } | null>(null);
  const [newLessonQuestion, setNewLessonQuestion] = useState<string>('');
  const [newLessonOptions, setNewLessonOptions] = useState<string>('Đáp án A, Đáp án B, Đáp án C, Đáp án D');
  const [newLessonCorrect, setNewLessonCorrect] = useState<number>(0);
  const [newLessonExpl, setNewLessonExpl] = useState<string>('');

  // Trạng thái đồng bộ bản tin (RSS/Atom)
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    details?: { added: number; updated: number; skipped: number; total: number; source: string; timestamp: string };
  } | null>(null);
  const [scheduledInterval, setScheduledInterval] = useState<number>(0); // 0 = Thủ công
  const [newsFilterSearch, setNewsFilterSearch] = useState<string>('');
  const [newsFilterStatus, setNewsFilterStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [newsFilterSource, setNewsFilterSource] = useState<'all' | 'sontra_gov' | 'manual' | 'feed'>('all');
  const [isAddNewsOpen, setIsAddNewsOpen] = useState<boolean>(false);
  const [newNewsTitle, setNewNewsTitle] = useState<string>('');
  const [newNewsSummary, setNewNewsSummary] = useState<string>('');
  const [newNewsContent, setNewNewsContent] = useState<string>('');
  const [newNewsSourceUrl, setNewNewsSourceUrl] = useState<string>('');
  const [newNewsImageUrl, setNewNewsImageUrl] = useState<string>('');
  const [newNewsError, setNewNewsError] = useState<string>('');
  const [newNewsSaving, setNewNewsSaving] = useState<boolean>(false);

  // Phân trang và bộ lọc (tách thành hàm để đếm tổng số mục)
  const [lessonPage, setLessonPage] = useState<number>(1);
  const [newsPage, setNewsPage] = useState<number>(1);

  const lessonMatches = (l: Lesson): boolean => {
    const isSoftDeleted = Boolean(l.deleted_at);
    if (lessonFilterStatus === 'active' && (isSoftDeleted || l.hidden === 1)) return false;
    if (lessonFilterStatus === 'hidden' && (isSoftDeleted || l.hidden === 0)) return false;
    if (lessonFilterStatus === 'deleted' && !isSoftDeleted) return false;
    if (lessonFilterGroup !== null && l.group_no !== lessonFilterGroup) return false;
    if (lessonFilterSearch.trim()) {
      const q = lessonFilterSearch.toLowerCase();
      const matchTitle = l.title.toLowerCase().includes(q);
      const matchBody = l.body.toLowerCase().includes(q);
      const matchNum = String(l.lesson).includes(q);
      if (!matchTitle && !matchBody && !matchNum) return false;
    }
    return true;
  };
  const filteredLessons = lessons.filter(lessonMatches);
  const lessonPageCount = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
  const lessonCurrentPage = Math.min(lessonPage, lessonPageCount);
  const lessonPageItems = filteredLessons.slice((lessonCurrentPage - 1) * PAGE_SIZE, lessonCurrentPage * PAGE_SIZE);

  const newsMatches = (n: NewsItem): boolean => {

            if (newsFilterStatus === 'visible' && n.hidden === 1) return false;
            if (newsFilterStatus === 'hidden' && n.hidden === 0) return false;
            if (newsFilterSource === 'sontra_gov' && n.source !== 'sontra_gov') return false;
            if (newsFilterSource === 'manual' && n.source !== 'manual') return false;
    if (newsFilterSource === 'feed' && n.source !== 'feed') return false;
            if (newsFilterSearch.trim()) {
              const q = newsFilterSearch.trim().toLowerCase();
              const matchTitle = n.title.toLowerCase().includes(q);
              const matchSummary = n.summary.toLowerCase().includes(q);
              if (!matchTitle && !matchSummary) return false;
            }
            return true;
            };
  const newsFiltered = news.filter(newsMatches);
  const newsPageCount = Math.max(1, Math.ceil(newsFiltered.length / PAGE_SIZE));
  const newsCurrentPage = Math.min(newsPage, newsPageCount);
  const newsPageItems = newsFiltered.slice((newsCurrentPage - 1) * PAGE_SIZE, newsCurrentPage * PAGE_SIZE);

  // Quay về trang 1 khi đổi bộ lọc
  useEffect(() => setLessonPage(1), [lessonFilterStatus, lessonFilterGroup, lessonFilterSearch]);
  useEffect(() => setNewsPage(1), [newsFilterStatus, newsFilterSource, newsFilterSearch]);

  // Nhấn Esc để đóng các hộp thoại sửa/thêm
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingLesson(null);
        setIsCreateLessonOpen(false);
        setIsAddNewsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 1. Phân tích đối chiếu năng lực theo Quy tắc 4.6 (chỉ học viên đủ 5 nhiệm vụ ở CẢ 2 lần đo)
  const comparisonResult = filterEligibleLearnersForComparison(assessments);
  const eligiblePairs = comparisonResult.pairedData;

  const taskKeys = ['task1', 'task2', 'task3', 'task4', 'task5'] as const;
  const taskNames = [
    'Nhiệm vụ 1: Thiết bị & Kết nối cơ bản',
    'Nhiệm vụ 2: Dịch vụ công & Thông tin Sơn Trà',
    'Nhiệm vụ 3: Giao tiếp & Mạng xã hội an toàn',
    'Nhiệm vụ 4: Thanh toán số & Tiện ích dân sinh',
    'Nhiệm vụ 5: Tự bảo vệ & Phòng chống lừa đảo số',
  ];

  const taskStats = taskKeys.map((key, idx) => {
    if (eligiblePairs.length === 0) {
      return { key, title: taskNames[idx], preAvg: 0, postAvg: 0, diff: 0 };
    }
    const preSum = eligiblePairs.reduce((acc, p) => acc + (p.pre.scores[key] || 0), 0);
    const postSum = eligiblePairs.reduce((acc, p) => acc + (p.post.scores[key] || 0), 0);
    const preAvg = Number((preSum / eligiblePairs.length).toFixed(2));
    const postAvg = Number((postSum / eligiblePairs.length).toFixed(2));
    const diff = Number((postAvg - preAvg).toFixed(2));
    return { key, title: taskNames[idx], preAvg, postAvg, diff };
  });

  // 2. Thống kê theo 5 nhóm bài học
  const groupStats = GROUPS_META.map((g) => {
    const groupLessons = lessons.filter((l) => l.group_no === g.id && !l.deleted_at);
    const lessonIds = new Set(groupLessons.map((l) => l.lesson));
    const completedProgress = progress.filter((p) => lessonIds.has(p.lesson) && p.done === 1);
    const passedProgress = progress.filter((p) => lessonIds.has(p.lesson) && p.score === 1);

    return {
      groupNo: g.id,
      name: g.name,
      totalLessons: groupLessons.length,
      completedCount: completedProgress.length,
      passedQuizCount: passedProgress.length,
    };
  });

  // 3. Thống kê kiểm tra hiểu bài chi tiết theo từng học viên (Quy tắc 4.17)
  const learnerDetailedStats = learners.map((lrn) => {
    const lrnProgress = progress.filter((p) => p.learner === lrn.id);
    const quizStats = calculateQuizPassStatus(lessons.filter((l) => !l.deleted_at), lrnProgress);
    const completedCount = lrnProgress.filter((p) => p.done === 1).length;

    return {
      id: lrn.id,
      code: lrn.code,
      name: lrn.full_name || lrn.email || lrn.code,
      email: lrn.email,
      provider: lrn.auth_provider || 'local',
      completedCount,
      passedQuizCount: quizStats.passedLessonCount,
      visibleCount: quizStats.visibleLessonCount,
      percentage: quizStats.percentage,
      isPassed: quizStats.isPassed,
      hasAttempts: quizStats.hasAttempts,
    };
  });

  // Xuất CSV Báo cáo Đối chiếu Năng lực (Quy tắc 4.6, UTF-8 BOM, UTC+7)
  const handleExportPrePostCsv = () => {
    const headers = [
      'Mã học viên',
      'T1 Trước',
      'T2 Trước',
      'T3 Trước',
      'T4 Trước',
      'T5 Trước',
      'T1 Sau',
      'T2 Sau',
      'T3 Sau',
      'T4 Sau',
      'T5 Sau',
      'Địa điểm cơ sở',
      'Người đánh giá trước',
      'Người đánh giá sau',
      'Thời gian đo trước (UTC+7)',
      'Thời gian đo sau (UTC+7)',
    ];

    const rows = eligiblePairs.map((p) => [
      p.learnerId,
      p.pre.scores.task1 ?? '',
      p.pre.scores.task2 ?? '',
      p.pre.scores.task3 ?? '',
      p.pre.scores.task4 ?? '',
      p.pre.scores.task5 ?? '',
      p.post.scores.task1 ?? '',
      p.post.scores.task2 ?? '',
      p.post.scores.task3 ?? '',
      p.post.scores.task4 ?? '',
      p.post.scores.task5 ?? '',
      p.post.location || p.pre.location || 'Sơn Trà',
      p.pre.assessor,
      p.post.assessor,
      formatUtcPlus7(p.pre.created),
      formatUtcPlus7(p.post.created),
    ]);

    exportCsvWithBom(headers, rows, `son_tra_so_doi_chieu_nang_luc_${Date.now()}.csv`);
  };

  // Xuất CSV Báo cáo Tiến độ Học viên
  const handleExportLearnersCsv = () => {
    const headers = [
      'Mã học viên',
      'Họ và tên',
      'Email',
      'Hình thức đăng nhập',
      'Số bài hoàn thành',
      'Số bài đạt quiz',
      'Tổng số bài hiện',
      'Tỷ lệ đạt (%)',
      'Trạng thái đạt chuẩn (≥70%)',
    ];

    const rows = learnerDetailedStats.map((l) => [
      l.code,
      l.name,
      l.email || '',
      l.provider,
      l.completedCount,
      l.passedQuizCount,
      l.visibleCount,
      `${l.percentage}%`,
      l.isPassed ? 'ĐẠT CHUẨN' : 'CHƯA ĐẠT',
    ]);

    exportCsvWithBom(headers, rows, `son_tra_so_bao_cao_hoc_vien_${Date.now()}.csv`);
  };

  // Thêm TNV mới
  const handleCreateVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVolMsg(null);
    try {
      await onAddVolunteer({
        email: volEmail,
        fullName: volFullName,
        initialPassword: volPassword,
        phone: volPhone,
        organization: volOrg,
      });
      setVolMsg({ type: 'success', text: `Đã khởi tạo TNV ${volFullName} thành công! Cờ must_change=1 đã được bật.` });
      setVolEmail('');
      setVolFullName('');
      setVolPhone('');
      setTimeout(() => {
        setIsAddVolunteerOpen(false);
        setVolMsg(null);
      }, 1500);
    } catch (err: any) {
      setVolMsg({ type: 'error', text: err.message || 'Lỗi khi tạo tình nguyện viên.' });
    }
  };

  // Xử lý upload tệp âm thanh thuyết minh (Audio Narration)
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
      alert('Định dạng âm thanh không được hỗ trợ. Vui lòng chọn tệp .mp3 hoặc .wav.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng tệp âm thanh vượt quá giới hạn 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isEdit && editingLesson) {
        setEditingLesson({
          ...editingLesson,
          audio_url: result,
          audio_type: 'file',
          audio_filename: file.name,
        });
      } else {
        setNewLessonAudioFile({ filename: file.name, dataUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Lưu sửa bài học (ghi snapshot vào lesson_versions)
  const handleSaveLessonEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;
    onUpdateLesson(editingLesson);
    setEditingLesson(null);
  };

  // Thêm bài học mới
  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    const nextLessonNo = Math.max(...lessons.map((l) => l.lesson), 0) + 1;
    const opts = newLessonOptions.split(',').map((s) => s.trim()).filter(Boolean);

    // Xác định video
    let video_url: string | undefined = undefined;
    let video_type: 'url' | 'file' | undefined = undefined;
    let video_filename: string | undefined = undefined;

    if (newLessonVideoMode === 'url' && newLessonVideoUrl.trim()) {
      video_url = newLessonVideoUrl.trim();
      video_type = 'url';
    }

    // Xác định audio
    let audio_url: string | undefined = undefined;
    let audio_type: 'url' | 'file' | undefined = undefined;
    let audio_filename: string | undefined = undefined;

    if (newLessonAudioMode === 'file' && newLessonAudioFile) {
      audio_url = newLessonAudioFile.dataUrl;
      audio_type = 'file';
      audio_filename = newLessonAudioFile.filename;
    } else if (newLessonAudioMode === 'url' && newLessonAudioUrl.trim()) {
      audio_url = newLessonAudioUrl.trim();
      audio_type = 'url';
    }

    const newL: Lesson = {
      lesson: nextLessonNo,
      title: newLessonTitle.trim(),
      group_no: Number(newLessonGroup),
      body: newLessonBody.trim(),
      quiz: {
        question: newLessonQuestion.trim(),
        options: opts.length > 0 ? opts : ['Đáp án A', 'Đáp án B'],
        correctChoice: Number(newLessonCorrect),
        explanation: newLessonExpl.trim() || 'Vui lòng đọc lại bài học.',
      },
      next_step: newLessonNextStep.trim() || undefined,
      video_url,
      video_type,
      video_filename,
      audio_url,
      audio_type,
      audio_filename,
      hidden: 0,
      deleted_at: null,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    onAddLesson(newL);
    setIsCreateLessonOpen(false);
    setNewLessonTitle('');
    setNewLessonBody('');
    setNewLessonNextStep('');
    setNewLessonVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    setNewLessonAudioUrl('');
    setNewLessonAudioFile(null);
    setNewLessonQuestion('');
  };

  // Đồng bộ bản tin từ nguồn RSS đã cấu hình
  const handleTriggerSync = async () => {
    if (!onSyncNews) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await onSyncNews();
      setSyncStatusMsg({
        type: 'success',
        text: res.message || 'Đồng bộ tin tức thành công!',
        details: {
          added: res.added,
          updated: res.updated,
          skipped: res.skipped,
          total: res.total,
          source: res.source,
          timestamp: res.timestamp,
        },
      });
    } catch (err: any) {
      // 403 = tính năng đang tắt chủ đích: không phải lỗi, hiển thị trung tính
      setSyncStatusMsg(
        err.status === 403
          ? { type: 'info', text: err.message }
          : { type: 'error', text: `Lỗi khi đồng bộ: ${err.message}` }
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Cấu hình lịch đồng bộ định kỳ (Cron Schedule)
  const handleScheduleChange = async (minutes: number) => {
    setScheduledInterval(minutes);
    setSyncStatusMsg({
      type: 'info',
      text: minutes > 0
        ? `Đã cài đặt lịch Cron: Tự động cào và đồng bộ tin tức mỗi ${minutes >= 60 ? `${minutes / 60} giờ` : `${minutes} phút`}.`
        : 'Đã chuyển sang chế độ đồng bộ thủ công (Tắt Cron).',
    });
  };

  // Tạo bài viết thủ công
  const handleCreateNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || newNewsSaving) return;
    const now = new Date().toISOString();
    setNewNewsError('');
    setNewNewsSaving(true);
    try {
      await onAddNews({
      id: Date.now(),
      title: newNewsTitle.trim(),
      summary: newNewsSummary.trim() || 'Thông tin chỉ đạo, hoạt động chuyển đổi số Sơn Trà.',
      content: newNewsContent.trim() || newNewsSummary.trim(),
      source_url: newNewsSourceUrl.trim() || undefined,
      image_url: newNewsImageUrl.trim() || undefined,
      source: 'manual',
      status: 'published',
      hidden: 0,
      published_at: now,
      created_by: 'Quản trị viên Sơn Trà Số',
      created: now,
      updated: now,
      });
      setIsAddNewsOpen(false);
      setNewNewsTitle('');
      setNewNewsSummary('');
      setNewNewsContent('');
      setNewNewsSourceUrl('');
      setNewNewsImageUrl('');
    } catch (err) {
      // Giữ nguyên nội dung đã nhập để quản trị viên sửa và lưu lại.
      setNewNewsError(err instanceof Error ? err.message : 'Không đăng được bài viết.');
    } finally {
      setNewNewsSaving(false);
    }
  };

  const volunteerAccounts = accounts.filter((a) => a.role === 'volunteer');

  return (
    <div className={`space-y-6 ${isLargeFont ? 'text-lg' : 'text-base'}`}>
      {/* Tab Switcher */}
      <div className="bg-white rounded-3xl border border-gray-200 p-2 shadow-sm flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'reports'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Thống kê & Báo cáo Chuyên sâu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('volunteers')}
          className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'volunteers'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Quản lý Tình nguyện viên ({volunteerAccounts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'lessons'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Quản lý Bài học & Xóa mềm
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('news')}
          className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'news'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          Bản tin Sơn Trà
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            activeTab === 'hero'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          Ảnh trang chủ
        </button>
      </div>

      {activeTab === 'hero' && <HeroSlidesAdmin />}

      {/* ================= TAB 1: THỐNG KÊ & BÁO CÁO CHUYÊN SÂU ================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Sub-tab selection */}
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl max-w-xl">
            <button
              type="button"
              onClick={() => setReportSubTab('prepost')}
              className={`flex-1 min-h-[40px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                reportSubTab === 'prepost'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Năng lực số Trước &amp; Sau Khóa học</span>
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab('groups')}
              className={`flex-1 min-h-[40px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                reportSubTab === 'groups'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Báo cáo 5 Nhóm bài</span>
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab('learners')}
              className={`flex-1 min-h-[40px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                reportSubTab === 'learners'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>Kiểm tra từng Học viên</span>
            </button>
          </div>

          {/* BÁO CÁO 1: ĐỐI CHIẾU NĂNG LỰC TRƯỚC - SAU (QUY TẮC 4.6) */}
          {reportSubTab === 'prepost' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase font-mono">
                      Khảo sát Thực nghiệm Khoa học
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                      Báo cáo Đối chiếu Năng lực số Trước & Sau Khóa học
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportPrePostCsv}
                    className="min-h-[44px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-sm self-start sm:self-auto"
                  >
                    <Download className="w-4 h-4" />
                    Xuất CSV (UTF-8 BOM, UTC+7)
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Quy tắc 4.6: Chỉ tính học viên hoàn thành đủ 5 nhiệm vụ ở CẢ HAI lần đo!
                  </p>
                  <p className="text-xs text-amber-800">
                    Các phiếu có trường null ("chưa đánh giá" theo Quy tắc 4.2) hoặc chỉ có 1 lần đo bị loại trừ khỏi bảng thống kê đối chiếu cặp để bảo đảm tính chuẩn xác khoa học.
                  </p>
                </div>

                {/* Thẻ số liệu */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Tổng số học viên khảo sát</div>
                    <div className="text-2xl font-black text-gray-900 mt-1">{learners.length} học viên</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-800 uppercase">Học viên đủ 5 nhiệm vụ 2 lần</div>
                    <div className="text-2xl font-black text-emerald-800 mt-1">{comparisonResult.eligibleLearners.length} học viên</div>
                    <span className="text-xs text-emerald-600 font-semibold">Được đưa vào phân tích đối chiếu</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <div className="text-xs font-semibold text-rose-800 uppercase">Học viên chưa đủ điều kiện</div>
                    <div className="text-2xl font-black text-rose-800 mt-1">{learners.length - comparisonResult.eligibleLearners.length} học viên</div>
                    <span className="text-xs text-rose-600">Bị loại trừ (thiếu task hoặc chỉ có 1 lần đo)</span>
                  </div>
                </div>

                {/* 5 Nhiệm vụ Trước vs Sau */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {taskStats.map((st) => (
                    <div
                      key={st.key}
                      className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-2.5 flex flex-col justify-between"
                    >
                      <h5 className="font-bold text-gray-900 text-xs sm:text-sm">{st.title}</h5>

                      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-gray-200">
                        <div>
                          <div className="text-[11px] text-gray-500">Trước (Pre)</div>
                          <div className="text-base font-bold text-amber-700">{st.preAvg}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500">Sau (Post)</div>
                          <div className="text-base font-bold text-emerald-700">{st.postAvg}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-gray-500">Tăng trưởng</div>
                          <div className="text-base font-black text-blue-700">+{st.diff}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BÁO CÁO 2: TỔNG HỢP THEO 5 NHÓM BÀI HỌC */}
          {reportSubTab === 'groups' && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Báo cáo Tổng hợp Hoàn thành theo 5 Nhóm Nhiệm vụ
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Theo dõi tỷ lệ hoàn thành bài học và vượt qua câu hỏi trắc nghiệm của từng nhóm chuyên đề.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupStats.map((grp) => (
                  <div key={grp.groupNo} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Nhóm {grp.groupNo}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">{grp.totalLessons} bài học</span>
                    </div>

                    <h4 className="font-bold text-gray-900 text-sm">{grp.name}</h4>

                    <div className="space-y-1.5 pt-2 border-t border-gray-200 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Lượt hoàn thành bài:</span>
                        <strong className="text-gray-900">{grp.completedCount} lượt</strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Lượt vượt qua Quiz:</span>
                        <strong className="text-emerald-700 font-bold">{grp.passedQuizCount} lượt</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BÁO CÁO 3: KIỂM TRA HIỂU BÀI TỪNG HỌC VIÊN */}
          {reportSubTab === 'learners' && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Báo cáo Kiểm tra Hiểu bài Chi tiết từng Học viên
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Chuẩn Quy tắc 4.17: Đạt chuẩn khi đúng từ 70% số bài học đang hiện trở lên (so sánh số nguyên).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportLearnersCsv}
                  className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Xuất danh sách CSV (UTF-8 BOM)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/80">
                      <th className="py-2.5 px-3">Mã học viên</th>
                      <th className="py-2.5 px-3">Họ và tên / Email</th>
                      <th className="py-2.5 px-3">Xác thực</th>
                      <th className="py-2.5 px-3">Đã hoàn thành</th>
                      <th className="py-2.5 px-3">Kết quả Quiz (Tử/Mẫu)</th>
                      <th className="py-2.5 px-3">Tỷ lệ (%)</th>
                      <th className="py-2.5 px-3">Chuẩn năng lực (≥70%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {learnerDetailedStats.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-3 font-bold text-gray-900 font-mono">{l.code}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900">{l.name}</div>
                          {l.email && <div className="text-xs text-gray-500 font-mono">{l.email}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              l.provider === 'google'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {l.provider === 'google' ? 'Google OAuth' : 'Email/Pass'}
                          </span>
                        </td>
                        <td className="py-3 px-3">{l.completedCount} bài</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                          {l.passedQuizCount} / {l.visibleCount} bài
                        </td>
                        <td className="py-3 px-3 font-bold">{l.percentage}%</td>
                        <td className="py-3 px-3">
                          {!l.hasAttempts ? (
                            <span className="text-gray-400 italic">Chưa làm bài</span>
                          ) : l.isPassed ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              ĐẠT CHUẨN (≥70%)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              Chưa đạt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: QUẢN LÝ TÌNH NGUYỆN VIÊN (ADMIN ONLY) ================= */}
      {activeTab === 'volunteers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 uppercase font-mono">
                  Phân cấp Quản trị
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Quản lý Đội ngũ Tình nguyện viên Cơ sở
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Tình nguyện viên <strong>KHÔNG tự đăng ký</strong>. Toàn bộ tài khoản do Admin cấp phát. Khi kết thúc đợt tình nguyện, Admin thực hiện <strong>Vô hiệu hóa (Deactivate)</strong> mà <strong>không xóa cứng</strong> dữ liệu phiếu đánh giá đã ghi nhận.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddVolunteerOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-sm self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                Khởi tạo Tình nguyện viên mới
              </button>
            </div>

            {/* Danh sách TNV */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/80">
                    <th className="py-2.5 px-3">Họ và tên TNV</th>
                    <th className="py-2.5 px-3">Email liên hệ</th>
                    <th className="py-2.5 px-3">Đơn vị / Tổ</th>
                    <th className="py-2.5 px-3">Số phiếu đã ghi</th>
                    <th className="py-2.5 px-3">Trạng thái (active)</th>
                    <th className="py-2.5 px-3">Cờ đổi MK (must_change)</th>
                    <th className="py-2.5 px-3">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {volunteerAccounts.map((vol) => {
                    const countAsm = assessments.filter((a) => a.assessor.toLowerCase() === vol.email.toLowerCase()).length;
                    return (
                      <tr key={vol.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-3 font-bold text-gray-900">{vol.full_name}</td>
                        <td className="py-3 px-3 font-mono text-gray-600">{vol.email}</td>
                        <td className="py-3 px-3 text-gray-600">{vol.organization || 'Tổ TNV Sơn Trà'}</td>
                        <td className="py-3 px-3 font-bold text-emerald-800">{countAsm} phiếu</td>
                        <td className="py-3 px-3">
                          {vol.active === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 w-max">
                              <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold w-max">
                              Đã vô hiệu hóa (0)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {vol.must_change === 1 ? (
                            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-xs font-bold">
                              1 (Buộc đổi lần đầu)
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">0 (Đã đổi)</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToggleAccountActive(vol.id)}
                              className={`min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg border transition ${
                                vol.active === 1
                                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {vol.active === 1 ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onResetAccountMustChange(vol.id)}
                              className="min-h-[36px] px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                              title="Yêu cầu TNV đổi mật khẩu ở lần đăng nhập tới"
                            >
                              {vol.must_change === 1 ? 'Bỏ cờ đổi MK' : 'Buộc đổi MK'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Thêm TNV mới */}
          {isAddVolunteerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-purple-700" />
                    Khởi tạo Tài khoản Tình nguyện viên
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddVolunteerOpen(false)}
                    className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateVolunteerSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Họ và tên TNV:</label>
                    <input
                      type="text"
                      value={volFullName}
                      onChange={(e) => setVolFullName(e.target.value)}
                      placeholder="Ví dụ: Hoàng Minh Đức"
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email đăng nhập:</label>
                    <input
                      type="email"
                      value={volEmail}
                      onChange={(e) => setVolEmail(e.target.value)}
                      placeholder="tnv.duc@sontra.edu.vn"
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mật khẩu tạm thời (10 - 200 ký tự):
                    </label>
                    <input
                      type="password"
                      value={volPassword}
                      onChange={(e) => setVolPassword(e.target.value)}
                      minLength={10}
                      maxLength={200}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Đơn vị / Tổ công tác:</label>
                    <input
                      type="text"
                      value={volOrg}
                      onChange={(e) => setVolOrg(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {volMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs ${
                        volMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {volMsg.text}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddVolunteerOpen(false)}
                      className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm"
                    >
                      Cấp tài khoản & Bật cờ must_change
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: QUẢN LÝ BÀI HỌC & XÓA MỀM ================= */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-5">
            {/* Header Tab */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase font-mono">
                    Quản lý Vòng đời & Bản lưu
                  </span>
                  <span className="text-xs text-gray-500 font-mono">Quy tắc 4.4, 4.15 & Soft Delete</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  Quản lý Nội dung Bài học, Video & Âm thanh Thuyết minh
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
                  Áp dụng <strong>Xóa mềm (Soft Delete)</strong> sử dụng trường <code>deleted_at</code> thay vì xóa cứng khỏi cơ sở dữ liệu, đảm bảo bảo toàn tính toàn vẹn tham chiếu của tiến độ học tập và các lượt quiz lịch sử. Hỗ trợ tải tệp Video (.mp4, .webm) hoặc nhúng URL YouTube, cùng tệp âm thanh đọc bài (.mp3, .wav) cho người lớn tuổi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateLessonOpen(true)}
                className="min-h-[46px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm bài học mới
              </button>
            </div>

            {/* Thanh công cụ định vị nhanh & Lọc bài học (Khắc phục cuộn chuột dài) */}
            <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Ô tìm kiếm */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tiêu đề, nội dung hoặc mã bài #..."
                    value={lessonFilterSearch}
                    onChange={(e) => setLessonFilterSearch(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {lessonFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setLessonFilterSearch('')}
                      className="absolute right-3 top-3 text-xs text-gray-400 hover:text-gray-700"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Bộ lọc trạng thái bài */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 text-xs font-semibold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setLessonFilterStatus('all')}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      lessonFilterStatus === 'all'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tất cả ({lessons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonFilterStatus('active')}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      lessonFilterStatus === 'active'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Đang hiện ({lessons.filter((l) => !l.deleted_at && l.hidden === 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonFilterStatus('hidden')}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      lessonFilterStatus === 'hidden'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-amber-700 hover:text-amber-800'
                    }`}
                  >
                    Đã ẩn ({lessons.filter((l) => !l.deleted_at && l.hidden === 1).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonFilterStatus('deleted')}
                    className={`min-h-[36px] px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      lessonFilterStatus === 'deleted'
                        ? 'bg-rose-700 text-white shadow-2xs'
                        : 'text-rose-700 hover:text-rose-800'
                    }`}
                  >
                    Đã xóa mềm ({lessons.filter((l) => Boolean(l.deleted_at)).length})
                  </button>
                </div>
              </div>

              {/* Lọc theo 5 Nhóm nhiệm vụ */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                <button
                  type="button"
                  onClick={() => setLessonFilterGroup(null)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    lessonFilterGroup === null
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Tất cả các nhóm
                </button>
                {GROUPS_META.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLessonFilterGroup(g.id)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      lessonFilterGroup === g.id
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Nhóm {g.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách bài học */}
            <div className="space-y-3 pt-2">
              {lessonPageItems
                .map((l) => {
                  const isSoftDeleted = Boolean(l.deleted_at);
                  const versionsCount = lessonVersions.filter((v) => v.lesson === l.lesson).length;

                  return (
                    <div
                      key={l.lesson}
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isSoftDeleted
                          ? 'bg-rose-50/60 border-rose-300'
                          : l.hidden === 1
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-white border-gray-200 hover:border-emerald-300 shadow-2xs'
                      }`}
                    >
                      {/* Cột thông tin bài */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            #{l.lesson}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Nhóm {l.group_no}
                          </span>

                          {/* Huy hiệu Video */}
                          {l.video_url && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                              {l.video_type === 'file' ? <FileVideo className="w-3 h-3 text-blue-700" /> : <Video className="w-3 h-3 text-blue-700" />}
                              <span>Video URL</span>
                            </span>
                          )}

                          {/* Huy hiệu Âm thanh đọc bài (Audio Narration) */}
                          {l.audio_url && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                              <Headphones className="w-3 h-3 text-purple-700" />
                              <span>{l.audio_type === 'file' ? (l.audio_filename || 'Tệp Audio') : 'Audio URL'}</span>
                            </span>
                          )}

                          {/* Trạng thái vòng đời */}
                          {isSoftDeleted ? (
                            <span className="text-xs font-black px-2.5 py-0.5 rounded bg-rose-200 text-rose-900 flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Đã xóa mềm ({formatUtcPlus7(l.deleted_at!)})
                            </span>
                          ) : l.hidden === 1 ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                              Đã ẩn (Quy tắc 4.15)
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đang hiện
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-base sm:text-lg text-gray-900 leading-snug">
                          {l.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{l.body}</p>

                        <div className="flex items-center gap-3 text-xs text-gray-400 font-mono pt-1">
                          <span>Tạo: {formatUtcPlus7(l.created)}</span>
                          <span>•</span>
                          <span>Sửa: {formatUtcPlus7(l.updated)}</span>
                        </div>
                      </div>

                      {/* Cột thao tác */}
                      <div className="flex items-center gap-2 flex-wrap self-start md:self-center shrink-0">
                        {!isSoftDeleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingLesson(l)}
                              className="min-h-[42px] px-3.5 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-emerald-700" /> Sửa bài
                            </button>

                            <button
                              type="button"
                              onClick={() => onToggleLessonVisibility(l.lesson)}
                              className="min-h-[42px] px-3.5 py-1.5 rounded-xl text-xs font-bold border border-gray-300 hover:bg-gray-100 flex items-center gap-1.5 transition cursor-pointer"
                            >
                              {l.hidden === 1 ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-700" /> Hiện bài
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-amber-700" /> Ẩn bài
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onSoftDeleteLesson(l.lesson)}
                              className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                              title="Xóa mềm bảo vệ toàn vẹn tham chiếu"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Xóa mềm
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRestoreLesson(l.lesson)}
                            className="min-h-[42px] px-4 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Khôi phục bài
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowVersionHistory(showVersionHistory === l.lesson ? null : l.lesson)}
                          className={`min-h-[42px] px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            showVersionHistory === l.lesson
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <History className="w-3.5 h-3.5" />
                          Bản lưu ({versionsCount})
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <Pager page={lessonCurrentPage} pageCount={lessonPageCount} total={filteredLessons.length} onChange={setLessonPage} />

          {/* Form Sửa bài học */}
                    {editingLesson && (
            <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditingLesson(null); }}>
              <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border-2 border-emerald-600 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-black text-xl text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-emerald-700" />
                  Chỉnh sửa Bài học #{editingLesson.lesson} (Tự động ghi bản lưu vào lesson_versions)
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLessonEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề bài học</label>
                    <input
                      type="text"
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nhóm nhiệm vụ:</label>
                    <select
                      value={editingLesson.group_no}
                      onChange={(e) => setEditingLesson({ ...editingLesson, group_no: Number(e.target.value) })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      {GROUPS_META.map((g) => (
                        <option key={g.id} value={g.id}>
                          Nhóm {g.id}: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nội dung bài học (từng bước rõ ràng)</label>
                  <textarea
                    rows={5}
                    value={editingLesson.body}
                    onChange={(e) => setEditingLesson({ ...editingLesson, body: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Quản lý Video cho bài học đang sửa */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Video className="w-4 h-4 text-blue-600" />
                      Video Bài học (liên kết YouTube hoặc URL)
                    </label>
                    {editingLesson.video_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingLesson({
                            ...editingLesson,
                            video_url: undefined,
                            video_type: undefined,
                            video_filename: undefined,
                          })
                        }
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Gỡ bỏ video
                      </button>
                    )}
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-gray-600 mb-1">
                      Dán liên kết YouTube (khuyến nghị) hoặc URL video. Không tải tệp video lên hosting.
                    </span>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={editingLesson.video_url || ''}
                      onChange={(e) =>
                        setEditingLesson({
                          ...editingLesson,
                          video_url: e.target.value,
                          video_type: 'url',
                          video_filename: undefined,
                        })
                      }
                      className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {editingLesson.video_url && (
                    <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>
                        Nguồn hiện tại: {editingLesson.video_url}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quản lý Âm thanh thuyết minh (Audio Narration) */}
                <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Headphones className="w-4 h-4 text-purple-700" />
                      Âm thanh Đọc bài học (Audio Narration cho người cao tuổi)
                    </label>
                    {editingLesson.audio_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingLesson({
                            ...editingLesson,
                            audio_url: undefined,
                            audio_type: undefined,
                            audio_filename: undefined,
                          })
                        }
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Gỡ bỏ âm thanh
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-xs font-semibold text-purple-900 mb-1">Tải tệp âm thanh (.mp3, .wav, .m4a, .ogg &le; 10 MB):</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav"
                        onChange={(e) => handleAudioUpload(e, true)}
                        className="w-full text-xs p-2 border border-purple-300 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-purple-900 mb-1">Hoặc đường dẫn URL âm thanh trực tuyến:</span>
                      <input
                        type="url"
                        placeholder="https://example.com/audio.mp3"
                        value={editingLesson.audio_type !== 'file' ? (editingLesson.audio_url || '') : ''}
                        onChange={(e) =>
                          setEditingLesson({
                            ...editingLesson,
                            audio_url: e.target.value,
                            audio_type: 'url',
                            audio_filename: undefined,
                          })
                        }
                        className="w-full text-xs p-2.5 border border-purple-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {editingLesson.audio_url && (
                    <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1">
                      <span className="text-xs text-purple-800 font-bold block">
                        Nghe thử tệp âm thanh hiện tại ({editingLesson.audio_filename || 'Bản thu âm'}):
                      </span>
                      <audio controls src={editingLesson.audio_url} className="w-full h-9" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Thực hành ngay sau bài học (next_step)</label>
                  <input
                    type="text"
                    value={editingLesson.next_step || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, next_step: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="Gợi ý hành động thực tế..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingLesson(null)}
                    className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Lưu & Ghi nhận phiên bản mới (lesson_versions)
                  </button>
                </div>
              </form>
              </div>
              </div>
            </div>
          )}

          {/* Form Thêm bài học mới */}
                    {isCreateLessonOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsCreateLessonOpen(false); }}>
              <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border-2 border-purple-600 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-black text-xl text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-700" />
                  Khởi tạo Bài học Mới
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreateLessonOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateLesson} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề bài:</label>
                    <input
                      type="text"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      placeholder="Ví dụ: Cách cài đặt mã PIN bảo vệ SIM..."
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nhóm nhiệm vụ:</label>
                    <select
                      value={newLessonGroup}
                      onChange={(e) => setNewLessonGroup(Number(e.target.value))}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                    >
                      {GROUPS_META.map((g) => (
                        <option key={g.id} value={g.id}>
                          Nhóm {g.id}: {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nội dung bài học:</label>
                  <textarea
                    rows={4}
                    value={newLessonBody}
                    onChange={(e) => setNewLessonBody(e.target.value)}
                    placeholder="Hướng dẫn từng bước dễ hiểu, phù hợp cho người cao tuổi..."
                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* Phần Quản lý Video bài học mới */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Video className="w-4 h-4 text-blue-600" />
                    Video Bài học (Upload tệp hoặc Nhập liên kết URL)
                  </label>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newVideoMode"
                        checked={newLessonVideoMode === 'url'}
                        onChange={() => setNewLessonVideoMode('url')}
                        className="text-purple-600"
                      />
                      <span>Đường dẫn URL (YouTube, Drive...)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newVideoMode"
                        checked={newLessonVideoMode === 'none'}
                        onChange={() => setNewLessonVideoMode('none')}
                        className="text-purple-600"
                      />
                      <span>Không dùng video</span>
                    </label>
                  </div>

                  {newLessonVideoMode === 'url' && (
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newLessonVideoUrl}
                      onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  )}

                </div>

                {/* Phần Quản lý Âm thanh đọc bài (Audio Narration) */}
                <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-3">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <Headphones className="w-4 h-4 text-purple-700" />
                    Âm thanh Đọc bài học (Audio Narration cho người lớn tuổi)
                  </label>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newAudioMode"
                        checked={newLessonAudioMode === 'none'}
                        onChange={() => setNewLessonAudioMode('none')}
                        className="text-purple-600"
                      />
                      <span>Chưa có âm thanh</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newAudioMode"
                        checked={newLessonAudioMode === 'file'}
                        onChange={() => setNewLessonAudioMode('file')}
                        className="text-purple-600"
                      />
                      <span>Tải tệp âm thanh (.mp3, .wav)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="newAudioMode"
                        checked={newLessonAudioMode === 'url'}
                        onChange={() => setNewLessonAudioMode('url')}
                        className="text-purple-600"
                      />
                      <span>URL âm thanh trực tuyến</span>
                    </label>
                  </div>

                  {newLessonAudioMode === 'file' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav"
                        onChange={(e) => handleAudioUpload(e, false)}
                        className="w-full text-xs p-2 border border-purple-300 rounded-xl bg-white"
                      />
                      {newLessonAudioFile && (
                        <div className="bg-white p-2.5 rounded-xl border border-purple-200 space-y-1">
                          <span className="text-xs text-purple-800 font-semibold block">
                            Đã tải: {newLessonAudioFile.filename}
                          </span>
                          <audio controls src={newLessonAudioFile.dataUrl} className="w-full h-8" />
                        </div>
                      )}
                    </div>
                  )}

                  {newLessonAudioMode === 'url' && (
                    <input
                      type="url"
                      placeholder="https://example.com/audio.mp3"
                      value={newLessonAudioUrl}
                      onChange={(e) => setNewLessonAudioUrl(e.target.value)}
                      className="w-full text-xs p-2.5 border border-purple-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Câu hỏi trắc nghiệm:</label>
                    <input
                      type="text"
                      value={newLessonQuestion}
                      onChange={(e) => setNewLessonQuestion(e.target.value)}
                      placeholder="Nội dung câu hỏi trắc nghiệm..."
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Các lựa chọn (ngăn cách bằng dấu phẩy):</label>
                    <input
                      type="text"
                      value={newLessonOptions}
                      onChange={(e) => setNewLessonOptions(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Thực hành ngay sau bài học (next_step):</label>
                  <input
                    type="text"
                    value={newLessonNextStep}
                    onChange={(e) => setNewLessonNextStep(e.target.value)}
                    placeholder="Ví dụ: Bác hãy thử mở phần Cài đặt và kéo cỡ chữ to hơn..."
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateLessonOpen(false)}
                    className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Lưu bài học mới
                  </button>
                </div>
              </form>
              </div>
              </div>
            </div>
          )}

          {/* Lịch sử phiên bản (Bảng lesson_versions) */}
          {showVersionHistory !== null && (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-700" />
                  Lịch sử phiên bản bài học #{showVersionHistory} (Bảng <code>lesson_versions</code>)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowVersionHistory(null)}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold"
                >
                  Đóng
                </button>
              </div>

              {lessonVersions.filter((v) => v.lesson === showVersionHistory).length === 0 ? (
                <p className="text-xs text-gray-500 italic py-2">
                  Bài học này chưa qua lần chỉnh sửa nào, đang giữ nguyên bản gốc ban đầu.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 text-xs space-y-3">
                  {lessonVersions
                    .filter((v) => v.lesson === showVersionHistory)
                    .map((ver) => (
                      <div key={ver.id} className="pt-3 space-y-1.5">
                        <div className="flex items-center justify-between font-semibold text-gray-800 flex-wrap gap-2">
                          <span className="font-mono bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                            Bản lưu: {formatUtcPlus7(ver.saved_at)}
                          </span>
                          <span className="text-gray-500 font-mono">Người lưu: {ver.saved_by}</span>
                        </div>
                        <div className="font-bold text-gray-900">{ver.title}</div>
                        <p className="text-gray-600 line-clamp-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          {ver.body}
                        </p>
                        <div className="flex items-center gap-3 text-gray-500 font-mono text-[11px]">
                          {ver.video_url && <span>Video: {ver.video_filename || ver.video_url}</span>}
                          {ver.audio_url && <span>Audio: {ver.audio_filename || ver.audio_url}</span>}
                          {ver.deleted_at && <span className="text-rose-600 font-bold">Xóa mềm lúc: {formatUtcPlus7(ver.deleted_at)}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: BẢN TIN SƠN TRÀ & TỰ ĐỘNG CÀO DỮ LIỆU ================= */}
      {activeTab === 'news' && (
        <div className="space-y-6">
          {/* Header & bộ điều khiển đồng bộ RSS/Atom */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-2.5 py-1 rounded font-mono flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    sontra.danang.gov.vn
                  </span>
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded font-mono">
                    Đồng bộ RSS / Atom
                  </span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mt-2">
                  Quản lý bản tin và đồng bộ nguồn RSS
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">
                  Đọc tin từ nguồn RSS/Atom đã được chủ dự án cấu hình (biến NEWS_FEED_URL trên máy chủ). Tính năng đang tắt cho đến khi có nguồn được cấp phép; hiện chỉ đăng tin thủ công.
                </p>
              </div>

              {/* Nút hành động */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTriggerSync()}
                  disabled={isSyncing}
                  className="min-h-[44px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Đang cào dữ liệu...' : 'Đồng bộ từ nguồn RSS đã cấu hình'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddNewsOpen(true)}
                  className="min-h-[44px] px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Thêm tin thủ công
                </button>
              </div>
            </div>

            {/* Cấu hình lịch tự động (Cron Schedule) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-gray-700">
                <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Tiến trình Tự động (Cron / Scheduled Task):</strong> Tự động cào dữ liệu theo chu kỳ mà không cần quản trị viên bấm thủ công.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="font-semibold text-gray-600">Chu kỳ chạy:</label>
                <select
                  value={scheduledInterval}
                  onChange={(e) => handleScheduleChange(Number(e.target.value))}
                  className="p-1.5 px-3 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-500"
                >
                  <option value={0}>Thủ công (Tắt tự động)</option>
                  <option value={15}>Mỗi 15 phút</option>
                  <option value={60}>Mỗi 1 giờ</option>
                  <option value={360}>Mỗi 6 giờ</option>
                  <option value={1440}>Mỗi 24 giờ</option>
                </select>
                {scheduledInterval > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Cron đang kích hoạt" />
                )}
              </div>
            </div>

            {/* Thông báo kết quả đồng bộ chi tiết (Sync Result Banner) */}
            {syncStatusMsg && (
              <div
                className={`p-4 rounded-2xl border ${
                  syncStatusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : syncStatusMsg.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-purple-50 border-purple-200 text-purple-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {syncStatusMsg.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
                      {syncStatusMsg.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                      {syncStatusMsg.type === 'info' && <Clock className="w-5 h-5 text-purple-600 shrink-0" />}
                      <span>{syncStatusMsg.text}</span>
                    </div>

                    {syncStatusMsg.details && (
                      <div className="text-xs pt-1 flex flex-wrap items-center gap-4 text-emerald-800 font-mono">
                        <span>Mới thêm: <strong>+{syncStatusMsg.details.added}</strong></span>
                        <span>Cập nhật: <strong>{syncStatusMsg.details.updated}</strong></span>
                        <span>Bỏ qua/Không đổi: <strong>{syncStatusMsg.details.skipped}</strong></span>
                        <span>Nguồn: <strong>{syncStatusMsg.details.source}</strong></span>
                        <span>Thời gian: <strong>{formatUtcPlus7(syncStatusMsg.details.timestamp)}</strong></span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSyncStatusMsg(null)}
                    className="text-xs font-bold opacity-60 hover:opacity-100"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Thống kê nhanh & Thanh tìm kiếm / Bộ lọc */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 font-semibold">Tổng số bài viết</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{news.length}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-emerald-700 font-semibold">Từ Cổng Sơn Trà</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {news.filter((n) => n.source === 'sontra_gov').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-purple-700 font-semibold">Tạo thủ công</span>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {news.filter((n) => n.source === 'manual').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-blue-700 font-semibold">Đang hiển thị</span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {news.filter((n) => n.hidden === 0).length}
              </div>
            </div>
          </div>

          {/* Thanh công cụ lọc */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={newsFilterSearch}
                onChange={(e) => setNewsFilterSearch(e.target.value)}
                placeholder="Tìm bài viết theo tiêu đề hoặc tóm tắt..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Lọc nguồn */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewsFilterSource('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterSource === 'all' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tất cả nguồn
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterSource('sontra_gov')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterSource === 'sontra_gov' ? 'bg-white shadow-xs text-emerald-800' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cổng Sơn Trà
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterSource('manual')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterSource === 'manual' ? 'bg-white shadow-xs text-purple-800' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Thủ công
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterSource('feed')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterSource === 'feed' ? 'bg-white shadow-xs text-blue-800' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Nguồn RSS
                </button>
              </div>

              {/* Lọc trạng thái */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewsFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterStatus === 'all' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tất cả ({news.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterStatus('visible')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterStatus === 'visible' ? 'bg-white shadow-xs text-blue-800' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Đang hiện ({news.filter((n) => n.hidden === 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterStatus('hidden')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    newsFilterStatus === 'hidden' ? 'bg-white shadow-xs text-rose-800' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Đã ẩn ({news.filter((n) => n.hidden === 1).length})
                </button>
              </div>
            </div>
          </div>

          {/* Modal Thêm bài viết thủ công */}
                    {isAddNewsOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-3 sm:p-8" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAddNewsOpen(false); }}>
              <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-600" />
                  Thêm bài viết tin tức mới
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddNewsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold"
                >
                  Đóng
                </button>
              </div>

              <form onSubmit={handleCreateNewsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề bài viết:</label>
                  <input
                    type="text"
                    value={newNewsTitle}
                    onChange={(e) => setNewNewsTitle(e.target.value)}
                    placeholder="Nhập tiêu đề thông tin nổi bật..."
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tóm tắt ngắn gọn:</label>
                  <textarea
                    value={newNewsSummary}
                    onChange={(e) => setNewNewsSummary(e.target.value)}
                    placeholder="Tóm tắt 2-3 câu ngắn gọn cho người dân dễ nắm bắt..."
                    rows={2}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nội dung đầy đủ (hiển thị khi người dân bấm "Đọc bài viết"):</label>
                    <textarea
                      rows={6}
                      value={newNewsContent}
                      onChange={(e) => setNewNewsContent(e.target.value)}
                      placeholder="Viết nội dung bài. Xuống dòng để tách đoạn. Có thể để trống (khi đó dùng tóm tắt)."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Đường dẫn bài viết gốc (URL):</label>
                  <input
                    type="url"
                    value={newNewsSourceUrl}
                    onChange={(e) => setNewNewsSourceUrl(e.target.value)}
                    placeholder="https://sontra.danang.gov.vn/..."
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Đường dẫn hình ảnh minh họa (Image URL):</label>
                  <input
                    type="url"
                    value={newNewsImageUrl}
                    onChange={(e) => setNewNewsImageUrl(e.target.value)}
                    placeholder="https://... ảnh bài viết"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {newNewsError && (
                  <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
                    {newNewsError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddNewsOpen(false)}
                    className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={newNewsSaving}
                    className="min-h-[44px] px-6 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    {newNewsSaving ? 'Đang lưu...' : 'Lưu bài viết'}
                  </button>
                </div>
              </form>
              </div>
              </div>
            </div>
          )}

          {/* Danh sách thẻ bài viết dạng Lưới Responsive */}
          {newsFiltered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
              <Newspaper className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="font-semibold">Không tìm thấy bài viết nào phù hợp với bộ lọc hiện tại.</p>
              <button
                type="button"
                onClick={() => {
                  setNewsFilterSearch('');
                  setNewsFilterStatus('all');
                  setNewsFilterSource('all');
                }}
                className="text-xs text-purple-700 font-bold underline"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {newsPageItems
                .map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl border p-5 shadow-sm transition flex flex-col justify-between space-y-4 hover:shadow-md ${
                      item.hidden === 1 ? 'border-gray-200 bg-gray-50/70 opacity-80' : 'border-gray-200'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Ảnh minh họa nếu có */}
                      {item.image_url ? (
                        <div className="h-44 w-full rounded-2xl overflow-hidden bg-gray-100 relative">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback nếu ảnh không load được
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute top-2.5 left-2.5">
                            {item.source === 'sontra_gov' ? (
                              <span className="bg-emerald-800/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                                <Globe className="w-3 h-3" />
                                sontra.danang.gov.vn
                              </span>
                            ) : (
                              <span className="bg-purple-800/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs">
                                Biên tập thủ công
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          {item.source === 'sontra_gov' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              sontra.danang.gov.vn
                            </span>
                          ) : (
                            <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                              Biên tập thủ công
                            </span>
                          )}

                          {item.hidden === 1 && (
                            <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                              Đã ẩn
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tiêu đề & Tóm tắt */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      <div className="text-[11px] text-gray-500 font-mono space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>Xuất bản: {formatUtcPlus7(item.published_at)}</span>
                          {item.hidden === 1 && !item.image_url && null}
                        </div>
                        {item.crawled_at && (
                          <div className="text-gray-400">Đồng bộ lúc: {formatUtcPlus7(item.crawled_at)}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {item.source_url ? (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-3.5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl flex items-center gap-1 transition"
                          >
                            Bài viết gốc
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <div />
                        )}

                        <button
                          type="button"
                          onClick={() => onToggleNewsVisibility(item.id)}
                          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                            item.hidden === 1
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {item.hidden === 1 ? 'Hiện lại' : 'Ẩn tin'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <Pager page={newsCurrentPage} pageCount={newsPageCount} total={newsFiltered.length} onChange={setNewsPage} />
        </div>
      )}
    </div>
  );
};

/** Điều hướng trang đơn giản: ẩn khi chỉ có một trang. */
function Pager({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4" aria-label="Phân trang">
      <span className="text-xs text-gray-600">Hiển thị {from}–{to} / {total} mục</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold disabled:opacity-40"
        >
          ← Trước
        </button>
        <span className="text-xs font-semibold text-gray-800">Trang {page} / {pageCount}</span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold disabled:opacity-40"
        >
          Sau →
        </button>
      </div>
    </nav>
  );
}
