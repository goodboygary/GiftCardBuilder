"use client";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <img src="/blogic-logo-full.png" alt="Blogic Systems" className="h-10" />
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <span className="text-indigo-600 font-semibold">Gift Card Builder</span>
        </nav>
      </div>
    </header>
  );
}
