'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Shared helpers ─────────────────────────────────────────────────────────────

export const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
export const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_TR = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
const DAYS_EN = ['Mo','Tu','We','Th','Fr','Sa','Su'];

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function firstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

// ── CalendarMonth (shared) ─────────────────────────────────────────────────────

export interface CalendarMonthProps {
  year: number;
  month: number;
  checkIn?: Date | null;
  checkOut?: Date | null;
  selected?: Date | null;       // for single-date mode
  hovered?: Date | null;
  today: Date;
  minDate?: Date;               // restrict past (e.g. today for checkin)
  maxDate?: Date;               // restrict future (e.g. today for birthdate)
  bookedDates?: Set<string>;    // 'YYYY-MM-DD' strings → show as booked
  isDateUnavailable?: (d: Date) => boolean;
  onSelect: (d: Date) => void;
  onHover?: (d: Date | null) => void;
  tr: boolean;
}

export function CalendarMonth({
  year, month,
  checkIn, checkOut, selected, hovered, today,
  minDate, maxDate, bookedDates, isDateUnavailable,
  onSelect, onHover, tr,
}: CalendarMonthProps) {
  const monthNames = tr ? MONTHS_TR : MONTHS_EN;
  const dayNames   = tr ? DAYS_TR   : DAYS_EN;
  const days       = daysInMonth(year, month);
  const firstDay   = firstDayOfMonth(year, month);
  const rangeEnd   = checkIn && !checkOut && hovered ? hovered : checkOut;

  function cellState(date: Date) {
    const t = date.getTime();
    const isBeforeMin = minDate ? date < minDate : false;
    const isAfterMax  = maxDate ? date > maxDate : false;
    const key          = `${year}-${String(month + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const isBooked     = bookedDates?.has(key) ?? false;
    const unavailable  = isDateUnavailable?.(date) ?? isBooked;
    const disabled     = isBeforeMin || isAfterMax || unavailable;

    const isSelected  = selected && t === selected.getTime();
    const isCheckIn   = checkIn  && t === checkIn.getTime();
    const isCheckOut  = checkOut && t === checkOut.getTime();
    const inRange     = checkIn && rangeEnd && t > checkIn.getTime() && t < rangeEnd.getTime();
    const isToday     = t === today.getTime();

    return { disabled, isSelected, isCheckIn, isCheckOut, inRange, isToday, isBooked, unavailable };
  }

  return (
    <div className="flex-1 min-w-0">
      <p className="text-center text-sm font-semibold text-main mb-3">
        {monthNames[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] text-subtle font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const date = startOfDay(new Date(year, month, i + 1));
          const s = cellState(date);

          let cls = 'text-xs py-1.5 select-none ';
          if (s.disabled && (s.isBooked || s.unavailable)) cls += 'bg-m-surface2 text-subtle rounded-lg cursor-not-allowed opacity-70';
          else if (s.disabled)                    cls += 'text-faint cursor-not-allowed';
          else if (s.isSelected || s.isCheckIn || s.isCheckOut) cls += 'bg-brand-accent text-black font-bold rounded-lg cursor-pointer';
          else if (s.inRange)                     cls += 'bg-brand-accent/20 text-main cursor-pointer';
          else if (s.isToday)                     cls += 'text-brand-accent font-semibold hover:bg-m-hover rounded-lg cursor-pointer';
          else                                    cls += 'text-muted hover:bg-m-hover hover:text-main rounded-lg cursor-pointer transition-all duration-150';

          return (
            <div
              key={i}
              className={cls}
              onClick={() => !s.disabled && !s.isBooked && onSelect(date)}
              onMouseEnter={() => !s.disabled && onHover?.(date)}
              onMouseLeave={() => onHover?.(null)}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SingleDatePickerModal ──────────────────────────────────────────────────────

interface SingleDatePickerModalProps {
  value: Date | null;
  onConfirm: (d: Date) => void;
  onClose: () => void;
  maxDate?: Date;    // e.g. today for birth date
  minDate?: Date;
  tr: boolean;
  label?: string;
}

export function SingleDatePickerModal({
  value, onConfirm, onClose, maxDate, minDate, tr, label,
}: SingleDatePickerModalProps) {
  const today = startOfDay(new Date());
  const [current, setCurrent] = useState(() => {
    const base = value ?? (maxDate ?? today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date | null>(value);
  const [mounted, setMounted] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  useEffect(() => setMounted(true), []);

  const monthNames = tr ? MONTHS_TR : MONTHS_EN;

  // Year range: 110 years back to maxDate's year (or today)
  const maxYear = (maxDate ?? today).getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => maxYear - i);

  function formatSelected(d: Date | null) {
    if (!d) return tr ? 'Seçilmedi' : 'Not selected';
    return d.toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="modal-shell p-5 w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {label && <p className="text-[10px] text-subtle uppercase tracking-wider mb-0.5">{label}</p>}
            <p className="text-sm font-semibold text-main">{formatSelected(selected)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-m-surface2 hover:bg-m-hover flex items-center justify-center text-muted hover:text-main">
            <X size={14} />
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrent(m => addMonths(m, -1))}
            className="w-8 h-8 rounded-lg bg-m-surface2 hover:bg-m-hover flex items-center justify-center text-muted hover:text-main"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setShowYearPicker(p => !p)}
            className="text-sm font-semibold text-main hover:text-brand-accent transition-colors px-2 py-1 rounded-lg hover:bg-m-hover"
          >
            {monthNames[current.getMonth()]} {current.getFullYear()}
          </button>

          <button
            onClick={() => setCurrent(m => addMonths(m, 1))}
            className="w-8 h-8 rounded-lg bg-m-surface2 hover:bg-m-hover flex items-center justify-center text-muted hover:text-main"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Year picker dropdown */}
        <AnimatePresence>
          {showYearPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 160, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-y-auto mb-3 grid grid-cols-4 gap-1 rounded-xl bg-m-surface border border-m-border p-2"
            >
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => {
                    setCurrent(new Date(y, current.getMonth(), 1));
                    setShowYearPicker(false);
                  }}
                  className={`text-xs py-1.5 rounded-lg transition-colors ${
                    y === current.getFullYear()
                      ? 'bg-brand-accent text-black font-bold'
                      : 'text-muted hover:bg-m-hover hover:text-main'
                  }`}
                >
                  {y}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar */}
        <CalendarMonth
          year={current.getFullYear()}
          month={current.getMonth()}
          selected={selected}
          today={today}
          minDate={minDate}
          maxDate={maxDate}
          onSelect={d => setSelected(d)}
          tr={tr}
        />

        {/* Confirm */}
        <div className="mt-4 flex justify-end">
          <button
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
            className="px-5 py-2 rounded-lg bg-brand-accent text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-accent/90 transition-colors"
          >
            {tr ? 'Onayla' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}
