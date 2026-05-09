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
        <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur-md shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-4">
            <p className="text-center sm:text-left text-xs text-gray-500 font-medium sm:mr-2">
              Pick your blueprint
            </p>
            <div
              className="flex rounded-xl bg-gray-100 p-1 gap-1 w-full sm:w-auto"
              role="tablist"
              aria-label="Wealth blueprint type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'family' ? 'true' : 'false'}
                onClick={() => setTab('family')}
                className={`flex-1 sm:flex-initial rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  tab === 'family'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Family
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'kids' ? 'true' : 'false'}
                onClick={() => setTab('kids')}
                className={`flex-1 sm:flex-initial rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  tab === 'kids'
                    ? 'bg-white text-fuchsia-700 shadow-sm ring-1 ring-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kids (8–15)
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
