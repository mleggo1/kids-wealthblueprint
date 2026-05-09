import { useState, useEffect } from 'react'
import FamilyWealthBlueprint from './components/FamilyWealthBlueprint'
import KidsWealthBlueprint from './components/KidsWealthBlueprint'
import PasswordGate from './components/PasswordGate'

type BlueprintTab = 'family' | 'kids'

function App() {
  const [tab, setTab] = useState<BlueprintTab>('family')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  return (
    <PasswordGate appName="Wealth Blueprint">
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 border-b border-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 shadow-[0_8px_32px_rgba(79,70,229,0.35)]">
          <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3">
            <p className="text-center text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-cyan-200 mb-2.5 drop-shadow-sm">
              Pick your blueprint
            </p>
            <div
              className="flex flex-col sm:flex-row rounded-2xl bg-black/25 p-1 sm:p-1.5 gap-1.5 sm:gap-2 ring-2 ring-white/20 shadow-inner backdrop-blur-sm"
              role="tablist"
              aria-label="Wealth blueprint type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'family' ? 'true' : 'false'}
                onClick={() => setTab('family')}
                className={`relative flex-1 overflow-hidden rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-center transition-all duration-300 ${
                  tab === 'family'
                    ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white shadow-[0_0_28px_rgba(59,130,246,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-cyan-300/90 scale-[1.02] z-10'
                    : 'bg-white/5 text-indigo-100/85 hover:bg-white/12 hover:text-white ring-1 ring-white/10'
                }`}
              >
                <span className="block text-xl sm:text-2xl mb-0.5" aria-hidden>
                  🏠
                </span>
                <span className="block text-sm sm:text-base font-extrabold tracking-tight">Family</span>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-90">
                  Wealth Blueprint
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'kids' ? 'true' : 'false'}
                onClick={() => setTab('kids')}
                className={`relative flex-1 overflow-hidden rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-center transition-all duration-300 ${
                  tab === 'kids'
                    ? 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-white shadow-[0_0_28px_rgba(217,70,239,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-amber-300/90 scale-[1.02] z-10'
                    : 'bg-white/5 text-fuchsia-100/90 hover:bg-white/12 hover:text-white ring-1 ring-white/10'
                }`}
              >
                <span className="block text-xl sm:text-2xl mb-0.5" aria-hidden>
                  🚀
                </span>
                <span className="block text-sm sm:text-base font-extrabold tracking-tight">Kids</span>
                <span className="mt-0.5 block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-90">
                  Ages 8–15
                </span>
              </button>
            </div>
          </div>
        </header>
        {tab === 'family' ? <FamilyWealthBlueprint /> : <KidsWealthBlueprint />}
      </div>
    </PasswordGate>
  )
}

export default App
