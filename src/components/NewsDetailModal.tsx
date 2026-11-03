/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Hộp thoại đọc toàn bộ bài viết tin tức (nội dung đầy đủ, không phải tóm tắt).
 */

import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { NewsItem } from '../types';
import { formatUtcPlus7 } from '../utils/rules';

export const NewsDetailModal: React.FC<{ item: NewsItem; onClose: () => void }> = ({ item, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fullText = item.content?.trim() ?? '';
  // Nếu có nội dung đầy đủ thì hiện tóm tắt như đoạn dẫn; nếu không thì chỉ hiện tóm tắt một lần.
  const paragraphs = (fullText || item.summary).split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-3 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-detail-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <article className="bg-white rounded-3xl max-w-2xl mx-auto p-6 sm:p-8 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="w-full max-h-80 object-cover rounded-2xl" />
        )}

        <p className="text-xs text-gray-500">{formatUtcPlus7(item.published_at)}</p>
        <h2 id="news-detail-title" className="text-xl sm:text-2xl font-black text-gray-900 leading-snug pr-8">
          {item.title}
        </h2>

        {fullText ? (
          <>
            <p className="font-semibold text-gray-800 leading-relaxed">{item.summary}</p>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 leading-relaxed">
                {p}
              </p>
            ))}
          </>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className="text-gray-700 leading-relaxed">
              {p}
            </p>
          ))
        )}

        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline min-h-[44px]"
          >
            Xem trên trang nguồn <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </article>
    </div>
  );
};
