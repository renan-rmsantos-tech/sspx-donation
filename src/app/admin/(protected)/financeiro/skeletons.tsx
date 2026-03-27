export function FinancialSummarySkeleton() {
  return (
    <div className="flex gap-6">
      <div
        className="flex-1 bg-white border border-[#EDE5DA] rounded-xl flex flex-col gap-3 pt-7 pl-7 pr-7 pb-6 animate-pulse"
        style={{ boxShadow: '#1C14100D 0px 2px 12px' }}
      >
        <div className="h-3 bg-[#E8EEF4] rounded w-32" />
        <div className="h-9 bg-[#E8EEF4] rounded w-48" />
        <div className="h-3 bg-[#E8EEF4] rounded w-40" />
      </div>

      <div
        className="flex-1 bg-white border border-[#EDE5DA] rounded-xl flex flex-col gap-3 pt-7 pl-7 pr-7 pb-6 animate-pulse"
        style={{ boxShadow: '#1C14100D 0px 2px 12px' }}
      >
        <div className="h-3 bg-[#E8EEF4] rounded w-32" />
        <div className="h-9 bg-[#E8EEF4] rounded w-48" />
        <div className="h-3 bg-[#E8EEF4] rounded w-40" />
      </div>
    </div>
  );
}

export function DonationsTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Table header skeleton */}
      <div className="flex gap-4 bg-[#E8EEF4] rounded-t-lg p-4 animate-pulse">
        <div className="h-4 bg-white rounded flex-1" />
        <div className="h-4 bg-white rounded flex-1" />
        <div className="h-4 bg-white rounded flex-1" />
        <div className="h-4 bg-white rounded flex-1" />
        <div className="h-4 bg-white rounded flex-1" />
      </div>

      {/* Table rows skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 bg-white p-4 border border-[#EDE5DA] animate-pulse">
          <div className="h-4 bg-[#E8EEF4] rounded flex-1" />
          <div className="h-4 bg-[#E8EEF4] rounded flex-1" />
          <div className="h-4 bg-[#E8EEF4] rounded flex-1" />
          <div className="h-4 bg-[#E8EEF4] rounded flex-1" />
          <div className="h-4 bg-[#E8EEF4] rounded flex-1" />
        </div>
      ))}
    </div>
  );
}
