import App from '@/App';
import { MobileApp } from '@/components/mobile/MobileApp';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromCookies } from '@/lib/auth/server';

// The mobile experience is admin-selectable (SystemSetting `mobile_design`):
//   'new'     → editorial mobile shell (md:hidden) + existing desktop
//   'classic' → original App.tsx for all breakpoints (old look)
// Desktop is identical in both cases.
export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let classic = false;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'mobile_design' } });
    classic = setting?.value === 'classic';
  } catch {
    // Fall back to the new design if the setting can't be read.
  }

  // Admin-only preview override: ?mobile_design=new|classic shows the other
  // design without changing the saved setting (visitors are unaffected).
  const override = (await searchParams).mobile_design;
  if (override === 'new' || override === 'classic') {
    const auth = await getAuthContextFromCookies().catch(() => null);
    if (auth?.user.roleSlug === 'admin') {
      classic = override === 'classic';
    }
  }

  if (classic) {
    return <App />;
  }

  return (
    <>
      {/* Mobile: new design-system shell */}
      <div className="md:hidden">
        <MobileApp />
      </div>
      {/* Desktop: existing experience, untouched */}
      <div className="hidden md:block">
        <App />
      </div>
    </>
  );
}
