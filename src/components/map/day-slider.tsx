'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DaySliderProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

function getDays(count: number): { date: string; dayName: string; dayNum: number; monthName: string; isToday: boolean }[] {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', ''),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
      isToday: i === 0,
    });
  }
  return days;
}

export function DaySlider({ selectedDate, onDateChange }: DaySliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const days = getDays(30);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center">
      {/* Left arrow - desktop only */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Days scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-2 py-1 snap-x snap-mandatory"
      >
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => onDateChange(day.date)}
            className={cn(
              'flex flex-col items-center min-w-[52px] px-2 py-2 rounded-xl text-xs transition-all duration-200 snap-center flex-shrink-0',
              selectedDate === day.date
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
            )}
          >
            <span className="uppercase text-[10px] font-semibold tracking-wide">
              {day.isToday ? 'Oggi' : day.dayName}
            </span>
            <span className="text-lg font-bold leading-tight">{day.dayNum}</span>
            <span className="text-[10px] uppercase tracking-wide">{day.monthName}</span>
          </button>
        ))}
      </div>

      {/* Right arrow - desktop only */}
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default DaySlider;
