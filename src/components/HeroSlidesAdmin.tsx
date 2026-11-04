/**
 * Quản lý ảnh trình chiếu trang chủ trong Cổng Quản trị.
 * Thêm, sửa, ẩn/hiện, xóa, sắp xếp thứ tự và chọn chế độ hiển thị (theo thứ tự hoặc ngẫu nhiên).
 * Trang chủ chỉ hiển thị tối đa 5 slide; quản trị có thể lưu nhiều hơn.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { HeroMode, HeroSlide } from '../types';

const MAX_VISIBLE = 5;
const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp';

interface FormState {
  title: string;
  body: string;
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  hidden: boolean;
}

const emptyForm: FormState = { title: '', body: '', imageUrl: '', buttonLabel: '', buttonUrl: '', hidden: false };

export const HeroSlidesAdmin: React.FC = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [mode, setMode] = useState<HeroMode>('order');
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  const load = async () => {
    setLoading(true);
    const res = await apiClient.request<{ slides: HeroSlide[]; mode: HeroMode; maxVisible: number }>({
      method: 'GET',
      path: '/admin/hero-slides',
    });
    setLoading(false);
    if (res.status === 200) {
      setSlides(res.body.slides);
      setMode(res.body.mode);
    } else {
      setNotice({ kind: 'error', text: res.body.error || 'Không tải được danh sách ảnh trình chiếu.' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Slide đang được hiển thị trên trang chủ (theo thứ tự). Với chế độ ngẫu nhiên, đây là nhóm ứng viên.
  const visibleIds = useMemo(
    () => new Set(slides.filter((s) => !s.hidden).slice(0, MAX_VISIBLE).map((s) => s.id)),
    [slides]
  );
  const visibleCount = slides.filter((s) => !s.hidden).length;

  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const openNew = () => {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  };

  const openEdit = (slide: HeroSlide) => {
    setForm({
      title: slide.title,
      body: slide.body ?? '',
      imageUrl: slide.imageUrl,
      buttonLabel: slide.buttonLabel ?? '',
      buttonUrl: slide.buttonUrl ?? '',
      hidden: slide.hidden,
    });
    setFormError('');
    setEditingId(slide.id);
  };

  const closeForm = () => setEditingId(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setFormError('');
    const res = await apiClient.uploadMedia('image', file, file.name);
    setUploading(false);
    if (res.status === 201) {
      setForm((f) => ({ ...f, imageUrl: res.body.url }));
    } else {
      setFormError(res.body.error || 'Tải ảnh lên thất bại.');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    setFormError('');
    const body = {
      title: form.title.trim(),
      body: form.body.trim(),
      imageUrl: form.imageUrl.trim(),
      buttonLabel: form.buttonLabel.trim(),
      buttonUrl: form.buttonUrl.trim(),
      hidden: form.hidden,
    };
    const isNew = editingId === 'new';
    const res = await apiClient.request<{ slide: HeroSlide; message: string }>({
      method: isNew ? 'POST' : 'PUT',
      path: isNew ? '/admin/hero-slides' : `/admin/hero-slides/${editingId}`,
      body,
    });
    setSaving(false);
    if (res.status === 201 || res.status === 200) {
      flash('ok', res.body.message || 'Đã lưu.');
      setEditingId(null);
      await load();
    } else {
      setFormError(res.body.error || 'Không lưu được slide.');
    }
  };

  const remove = async (slide: HeroSlide) => {
    if (!window.confirm(`Xóa slide “${slide.title}”? Có thể khôi phục bằng cách tạo lại.`)) return;
    const res = await apiClient.request({ method: 'DELETE', path: `/admin/hero-slides/${slide.id}` });
    if (res.status === 200) {
      flash('ok', 'Đã xóa slide.');
      await load();
    } else {
      flash('error', res.body.error || 'Không xóa được slide.');
    }
  };

  const toggleHidden = async (slide: HeroSlide) => {
    const res = await apiClient.request<{ slide: HeroSlide }>({
      method: 'PUT',
      path: `/admin/hero-slides/${slide.id}`,
      body: { hidden: !slide.hidden },
    });
    if (res.status === 200) await load();
    else flash('error', res.body.error || 'Không đổi được trạng thái.');
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const ids = slides.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const res = await apiClient.request({ method: 'POST', path: '/admin/hero-slides/order', body: { ids } });
    if (res.status === 200) await load();
    else flash('error', res.body.error || 'Không lưu được thứ tự.');
  };

  const changeMode = async (next: HeroMode) => {
    if (next === mode) return;
    const res = await apiClient.request<{ mode: HeroMode }>({
      method: 'PUT',
      path: '/admin/hero-slides/mode',
      body: { mode: next },
    });
    if (res.status === 200) {
      setMode(res.body.mode);
      flash('ok', 'Đã lưu chế độ hiển thị.');
    } else {
      flash('error', res.body.error || 'Không lưu được chế độ.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">Ảnh trình chiếu trang chủ</h3>
            <p className="text-sm text-gray-600 mt-1">
              Trang chủ chỉ hiển thị tối đa <strong>{MAX_VISIBLE}</strong> slide. Đang hiện:{' '}
              <strong>{Math.min(visibleCount, MAX_VISIBLE)}</strong> / {visibleCount} slide đang bật.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm slide
          </button>
        </div>

        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="font-bold text-gray-700 mb-1">Cách chọn slide hiển thị:</legend>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="radio" name="hero-mode" checked={mode === 'order'} onChange={() => changeMode('order')} />
            Theo thứ tự sắp xếp (lấy {MAX_VISIBLE} slide đầu)
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="radio" name="hero-mode" checked={mode === 'random'} onChange={() => changeMode('random')} />
            Ngẫu nhiên ({MAX_VISIBLE} slide trong số đang bật, mỗi lần tải trang)
          </label>
        </fieldset>

        {notice && (
          <div
            role="status"
            className={`p-3 rounded-xl text-sm border ${
              notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {notice.text}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Đang tải...</p>
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center text-gray-500 text-sm">
          Chưa có slide nào. Trang chủ sẽ hiển thị nội dung giới thiệu mặc định.
        </div>
      ) : (
        <ul className="space-y-3">
          {slides.map((slide, index) => {
            const onHome = visibleIds.has(slide.id);
            return (
              <li
                key={slide.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-sm"
              >
                <img src={slide.imageUrl} alt="" className="w-full sm:w-40 h-24 object-cover rounded-xl bg-gray-100" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
                    <h4 className="font-bold text-gray-900 truncate">{slide.title}</h4>
                    {slide.hidden && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Đang ẩn</span>}
                    {!slide.hidden && onHome && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Hiển thị trên trang chủ</span>
                    )}
                    {!slide.hidden && !onHome && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Chưa hiển thị (vượt giới hạn)</span>
                    )}
                  </div>
                  {slide.body && <p className="text-sm text-gray-600 line-clamp-2">{slide.body}</p>}
                  {slide.buttonLabel && slide.buttonUrl && (
                    <p className="text-xs text-gray-500">Nút: “{slide.buttonLabel}” → {slide.buttonUrl}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Đưa lên"
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === slides.length - 1}
                    aria-label="Đưa xuống"
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-gray-300 disabled:opacity-40"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(slide)}
                    className="min-h-[40px] inline-flex items-center gap-1 px-3 rounded-lg border border-gray-300 text-sm font-semibold"
                  >
                    <Pencil className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleHidden(slide)}
                    className="min-h-[40px] inline-flex items-center gap-1 px-3 rounded-lg border border-gray-300 text-sm font-semibold"
                  >
                    {slide.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {slide.hidden ? 'Hiện' : 'Ẩn'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(slide)}
                    className="min-h-[40px] inline-flex items-center gap-1 px-3 rounded-lg border border-red-300 text-red-700 text-sm font-semibold"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editingId !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeForm();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={editingId === 'new' ? 'Thêm slide' : 'Sửa slide'}
        >
          <form onSubmit={save} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h4 className="text-lg font-extrabold text-gray-900">{editingId === 'new' ? 'Thêm slide' : 'Sửa slide'}</h4>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Ảnh (JPG, PNG hoặc WebP, tối đa 5 MB):</label>
              {form.imageUrl && (
                <img src={form.imageUrl} alt="" className="w-full h-40 object-cover rounded-xl mb-2 bg-gray-100" />
              )}
              <input
                type="file"
                accept={ACCEPTED_IMAGES}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
                className="block w-full text-sm"
              />
              {uploading && <p className="text-xs text-gray-500 mt-1">Đang tải ảnh lên...</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề (3–200 ký tự):</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nội dung (tối đa 1000 ký tự):</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3}
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nhãn nút (tùy chọn):</label>
                <input
                  type="text"
                  value={form.buttonLabel}
                  onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
                  placeholder="Ví dụ: Xem bài học"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Đường dẫn nút (tùy chọn):</label>
                <input
                  type="text"
                  value={form.buttonUrl}
                  onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                  placeholder="/lessons hoặc https://..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.hidden} onChange={(e) => setForm({ ...form, hidden: e.target.checked })} />
              Ẩn slide này (không hiển thị trên trang chủ)
            </label>

            {formError && <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={closeForm} className="min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm font-semibold">
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || uploading || !form.imageUrl}
                className="min-h-[44px] px-6 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-bold"
              >
                {saving ? 'Đang lưu...' : 'Lưu slide'}
              </button>
            </div>
            {!form.imageUrl && <p className="text-xs text-gray-500">Cần chọn ảnh trước khi lưu.</p>}
          </form>
        </div>
      )}
    </div>
  );
};
