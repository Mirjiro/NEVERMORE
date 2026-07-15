export default function UnderConstruction({ tab }: { tab: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-4xl">🚧</span>
      <h1 className="text-lg font-semibold text-zinc-200">Under Construction</h1>
      <p className="text-sm text-zinc-500">The {tab} tab isn&apos;t built yet — check back soon.</p>
    </div>
  );
}
