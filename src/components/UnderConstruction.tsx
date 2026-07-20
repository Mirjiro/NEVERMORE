export default function UnderConstruction({ tab }: { tab: string }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-4xl">🚧</span>
      <h1 className="text-lg font-semibold text-ink">Under Construction</h1>
      <p className="text-sm text-ink-faint">The {tab} tab isn&apos;t built yet — check back soon.</p>
    </div>
  );
}
