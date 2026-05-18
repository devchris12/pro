/**
 * User setup layout — covers the dashboard shell (TopBar + SideRail)
 * completely so onboarding feels like a standalone full-screen experience.
 * The parent dashboard/layout.tsx still mounts but is hidden behind this overlay.
 */
export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="fixed inset-0 z-[360] bg-gray-50 overflow-y-auto">
      {children}
    </div>
  );
}
