'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Users, Coffee, Check, ShieldCheck } from 'lucide-react';
import { Cabin } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cabin: Cabin;
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
}

export function BookingModal({
  isOpen,
  onClose,
  cabin,
  checkInDate,
  checkOutDate,
  guestsCount,
}: BookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const calculateNights = () => {
    const inDay = Number(checkInDate);
    const outDay = Number(checkOutDate);

    if (!Number.isFinite(inDay) || !Number.isFinite(outDay) || outDay <= inDay) {
      return 3;
    }

    return outDay - inDay;
  };

  const nights = calculateNights();
  const rawPrice = cabin.price * nights;
  const cleaningFee = 85;
  const serviceFee = 45;
  const totalPrice = rawPrice + cleaningFee + serviceFee;

  const handleConfirmReservation = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cabinId: cabin.id,
          checkInDay: Number(checkInDate),
          checkOutDay: Number(checkOutDate),
          guestsCount,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Reservation could not be confirmed.');
      }

      alert(`Rezervasyonunuz alındı. Onay kodu: ${payload.confirmationId}. Detaylar e-posta adresinize gönderildi.`);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Reservation could not be confirmed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-lg overflow-hidden modal-shell select-none"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-m-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-brand-accent h-5 w-5 animate-pulse" />
              <h3 className="text-lg font-medium tracking-tight">{t('booking.title')}</h3>
            </div>
            <button
              onClick={onClose}
              className="btn-icon p-1 hover:bg-m-hover"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <div className="flex gap-4 items-center">
              <img
                src={cabin.imageUrl}
                alt={cabin.name}
                referrerPolicy="no-referrer"
                className="w-24 h-20 object-cover rounded-lg border border-white/10"
              />
              <div>
                <p className="text-xs text-brand-accent font-semibold tracking-wider uppercase mb-1">
                  {cabin.location}
                </p>
                <h4 className="font-semibold text-base leading-snug">{t(`cabin.${cabin.id}.name`)}</h4>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-white/70">
                  <span>★ {cabin.rating}</span>
                  <span>•</span>
                  <span>{cabin.specs.size}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 surface-card p-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-white/50 h-5 w-5 shrink-0" />
                <div>
                  <p className="label-sm">{t('booking.arrivalExp')}</p>
                  <p className="text-sm font-medium">May {checkInDate}, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="text-white/50 h-5 w-5 shrink-0" />
                <div>
                  <p className="label-sm">{t('booking.departureObj')}</p>
                  <p className="text-sm font-medium">May {checkOutDate}, 2026</p>
                </div>
              </div>
              <div className="sm:col-span-2 border-t border-m-border pt-3 mt-1 flex items-center gap-3">
                <Users className="text-white/50 h-5 w-5 shrink-0" />
                <div>
                  <p className="label-sm">{t('booking.partySize')}</p>
                  <p className="text-sm font-medium">{guestsCount} {t('booking.guestCount')}</p>
                </div>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm text-white/80">
                <span>${cabin.price} × {nights} {t('booking.night')}</span>
                <span>${rawPrice}</span>
              </div>
              <div className="flex justify-between text-sm text-white/80">
                <span>{t('exp.insurance')}</span>
                <span>${cleaningFee}</span>
              </div>
              <div className="flex justify-between text-sm text-white/80">
                <span>Kütahya Garden Otel Service Fee</span>
                <span>${serviceFee}</span>
              </div>
              <div className="border-t border-white/10 pt-3 mt-1 flex justify-between text-base font-semibold">
                <span>{t('booking.estTotal')}</span>
                <span className="text-brand-accent text-lg">${totalPrice}</span>
              </div>
            </div>

            {/* Complimentary Addon badge */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
              <div className="bg-emerald-500/15 p-1.5 rounded-full text-emerald-400">
                <Check size={16} />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-emerald-300">Complimentary Welcome Basket</p>
                <p className="text-white/60">Local treats, wood fuel supply & complimentary hot sauna access.</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-m-surface2 border-t border-m-border flex justify-between items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-main transition-colors"
            >
              {t('booking.cancel')}
            </button>
            <button
              onClick={handleConfirmReservation}
              disabled={isSubmitting}
              className="btn-primary px-6 py-2.5 rounded-full text-sm"
            >
              {isSubmitting ? t('booking.initiating') : t('booking.initiate')}
            </button>
          </div>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
