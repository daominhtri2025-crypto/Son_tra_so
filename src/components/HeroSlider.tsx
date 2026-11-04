/**
 * Khung trình chiếu ảnh trang chủ (tối đa 5 slide do máy chủ trả về).
 * Tự chuyển slide sau vài giây; tạm dừng khi rê chuột hoặc khi bàn phím đang ở trong khung;
 * không tự chuyển nếu hệ điều hành yêu cầu giảm chuyển động.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroSlide } from '../types';

const INTERVAL_MS = 6000;

interface HeroSliderProps {
  slides: HeroSlide[];
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ slides }) => {
  const [index, setIndex] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const count = slides.length;

  // Khi danh sách đổi (ví dụ sau khi quản trị sửa), đưa về slide đầu tiên.
  useEffect(() => {
    setIndex(0);
  }, [slides]);

  const go = useCallback(
    (n: number) => {
      if (count === 0) return;
      setIndex(((n % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;
  const current = slides[Math.min(index, count - 1)];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Ảnh trình chiếu trang chủ"
      className="relative overflow-hidden rounded-3xl border-4 border-amber-400 shadow-xl bg-emerald-950 text-white min-h-[300px] sm:min-h-[360px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img
            src={slide.imageUrl}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/60 to-emerald-950/20" />
        </div>
      ))}

      <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-10 pb-16 sm:pb-16 max-w-3xl space-y-3 min-h-[300px] sm:min-h-[360px]">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight drop-shadow">{current.title}</h2>
        {current.body && (
          <p className="text-emerald-50 text-sm sm:text-base leading-relaxed whitespace-pre-line">{current.body}</p>
        )}
        {current.buttonLabel && current.buttonUrl && (
          <a
            href={current.buttonUrl}
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm shadow"
          >
            {current.buttonLabel}
          </a>
        )}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Ảnh trước"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Ảnh tiếp theo"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Chuyển đến ảnh ${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${i === index ? 'w-8 bg-amber-400' : 'w-2.5 bg-white/60 hover:bg-white'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
