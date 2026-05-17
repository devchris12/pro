export default function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    </div>
  );
}
