import { useState, useEffect, useRef } from 'react'
import FamilyWealthBlueprint from './components/FamilyWealthBlueprint'
import KidsWealthBlueprint from './components/KidsWealthBlueprint'
import PasswordGate from './components/PasswordGate'

type BlueprintTab = 'family' | 'kids'

function App() {
  const [tab, setTab] = useState<BlueprintTab>('family')
  const pdfExportRef = useRef<(() => Promise<void>) | null>(null)
  const [pdfWorking, setPdfWorking] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const handlePdfClick = () => {
    void (async () => {
      const run = pdfExportRef.current
      if (!run) {
        window.alert('Report is still loading. Try again in a moment.')
        return
      }
      setPdfWorking(true)
      try {
        await run()
      } finally {
        setPdfWorking(false)
      }
    })()
  }

  return (
    <PasswordGate appName="Wealth Blueprint">
      <div className="min-h-screen">
        <header className="border-b border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 shadow-[0_2px_12px_rgba(79,70,229,0.2)]">
          <div className="max-w-5xl mx-auto px-2 sm:px-4 py-1 sm:py-1.5">
            <div className="flex items-end sm:items-center gap-1.5 sm:gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-center text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-cyan-200 mb-0.5 drop-shadow-sm leading-none">
                  Pick your blueprint
                </p>
                <div
                  className="flex flex-row rounded-xl bg-black/25 p-0.5 gap-1 ring-1 ring-white/15 shadow-inner backdrop-blur-sm"
                  role="tablist"
                  aria-label="Wealth blueprint type"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'family' ? 'true' : 'false'}
                    onClick={() => setTab('family')}
                    className={`relative flex-1 min-w-0 overflow-hidden rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-left sm:text-center transition-all duration-200 flex items-center gap-1.5 sm:justify-center sm:gap-1.5 ${
                      tab === 'family'
                        ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-cyan-300/80 z-10'
                        : 'bg-white/5 text-indigo-100/90 hover:bg-white/12 hover:text-white ring-1 ring-white/10'
                    }`}
                  >
                    <span className="shrink-0 text-sm sm:text-base leading-none" aria-hidden>
                      🏠
                    </span>
                    <span className="min-w-0 flex flex-col sm:items-center leading-tight">
                      <span className="text-[11px] sm:text-sm font-extrabold tracking-tight">Family</span>
                      <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wide opacity-85 truncate max-w-[7rem] sm:max-w-none">
                        Wealth Blueprint
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'kids' ? 'true' : 'false'}
                    onClick={() => setTab('kids')}
                    className={`relative flex-1 min-w-0 overflow-hidden rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-left sm:text-center transition-all duration-200 flex items-center gap-1.5 sm:justify-center sm:gap-1.5 ${
                      tab === 'kids'
                        ? 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-amber-300/80 z-10'
                        : 'bg-white/5 text-fuchsia-100/90 hover:bg-white/12 hover:text-white ring-1 ring-white/10'
                    }`}
                  >
                    <span className="shrink-0 text-sm sm:text-base leading-none" aria-hidden>
                      🚀
                    </span>
                    <span className="min-w-0 flex flex-col sm:items-center leading-tight">
                      <span className="text-[11px] sm:text-sm font-extrabold tracking-tight">Kids</span>
                      <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wide opacity-85">
                        Ages 8–15
                      </span>
                    </span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePdfClick}
                disabled={pdfWorking}
                className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] sm:text-xs font-extrabold text-white shadow-md ring-1 ring-white/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-55"
                title="Download the current blueprint report as PDF"
              >
                {pdfWorking ? '…' : 'PDF'}
              </button>
            </div>
          </div>
        </header>
        {tab === 'family' ? (
          <FamilyWealthBlueprint pdfExportRef={pdfExportRef} />
        ) : (
          <KidsWealthBlueprint pdfExportRef={pdfExportRef} />
        )}
      </div>
    </PasswordGate>
  )
}

export default App
