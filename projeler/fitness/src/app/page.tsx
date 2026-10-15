export const dynamic = "force-dynamic";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Gallery } from "@/components/landing/Gallery";
import { Pricing } from "@/components/landing/Pricing";
import { Trainers } from "@/components/landing/Trainers";
import { Schedule } from "@/components/landing/Schedule";
import { BMICalculator } from "@/components/landing/BMICalculator";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { Contact } from "@/components/landing/Contact";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@/types";

async function getLandingData() {
  const [rawPlans, memberCount, trainerCount, todayCheckIns, rawTrainers, rawTestimonials, rawGallery, rawSchedule, rawContactSettings] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.trainer.count({ where: { isActive: true } }),
    prisma.attendance.count({ where: { checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.trainer.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true, avatarUrl: true } } },
      orderBy: { rating: "desc" },
      take: 4,
    }),
    prisma.testimonial.findMany({
      where: { isVisible: true },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, name: true, role: true, content: true, rating: true },
    }),
    prisma.galleryImage.findMany({
      where: { isVisible: true },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, url: true, caption: true },
    }),
    prisma.groupClass.findMany({
      where: { isPublished: true, status: "SCHEDULED", startAt: { gte: new Date() } },
      include: { trainer: { include: { user: { select: { name: true } } } } },
      orderBy: { startAt: "asc" },
      take: 24,
    }),
    prisma.siteSetting.findMany({
      where: { key: { in: ["contact.phone", "contact.email", "contact.address", "contact.hours", "contact.whatsapp", "contact.mapUrl"] } },
      select: { key: true, value: true },
    }),
  ]);

  const plans: Plan[] = rawPlans.map((p: typeof rawPlans[number]) => ({
    ...p,
    price: Number(p.price),
    createdAt: p.createdAt.toISOString(),
  }));

  const trainers = rawTrainers.map((t: typeof rawTrainers[number]) => ({
    id: t.id,
    specialty: t.specialty,
    experience: t.experience,
    rating: Number(t.rating),
    user: t.user,
  }));

  const schedule = rawSchedule.map((c: typeof rawSchedule[number]) => ({
    id: c.id,
    title: c.title,
    trainerName: c.trainer?.user.name ?? null,
    capacity: c.capacity,
    durationMin: c.durationMin,
    color: c.color,
    startAt: c.startAt.toISOString(),
  }));

  const contactMap = Object.fromEntries(rawContactSettings.map((s: typeof rawContactSettings[number]) => [s.key, s.value]));

  return {
    plans,
    stats: { members: memberCount, trainers: trainerCount, todayCheckIns },
    trainers,
    testimonials: rawTestimonials,
    gallery: rawGallery,
    schedule,
    contact: {
      phone: contactMap["contact.phone"] ?? null,
      email: contactMap["contact.email"] ?? null,
      address: contactMap["contact.address"] ?? null,
      hours: contactMap["contact.hours"] ?? null,
      whatsapp: contactMap["contact.whatsapp"] ?? null,
      mapUrl: contactMap["contact.mapUrl"] ?? null,
    },
  };
}

export default async function HomePage() {
  const { plans, stats, trainers, testimonials, gallery, schedule, contact } = await getLandingData();

  return (
    <>
      <Navbar />
      <main>
        <Hero stats={stats} />
        <Features />
        <Gallery items={gallery} />
        <Pricing plans={plans} />
        <Trainers trainers={trainers} />
        <Schedule items={schedule} />
        <BMICalculator />
        <Testimonials items={testimonials} />
        <FAQ />
        <Contact {...contact} />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
