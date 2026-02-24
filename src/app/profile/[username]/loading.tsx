export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="h-8 w-32 rounded bg-gray-200" />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-4 rounded bg-gray-100" />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 rounded bg-gray-100" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
