import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-neon/10 blur-[120px]" />

      <div className="relative min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:block relative">
          <img
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-ink-950 via-ink-950/70 to-transparent" />
          <div className="relative h-full flex flex-col justify-between p-12">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-neon grid place-items-center shadow-glow">
                <Dumbbell className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-xl">Baha<span className="text-neon">Fitness</span></span>
            </Link>
            <div className="max-w-md">
              <h2 className="h-display text-4xl">
                Limitlerini aş, <span className="text-gradient-neon">en iyi versiyonun ol.</span>
              </h2>
              <p className="mt-4 text-body">
                Fitness yolculuğuna bugün başla.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
