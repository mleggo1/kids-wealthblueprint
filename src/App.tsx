import KidsWealthBlueprint from './components/KidsWealthBlueprint'
import PasswordGate from './components/PasswordGate'

function App() {
  return (
    <PasswordGate appName="Kids Wealth Blueprint">
      <KidsWealthBlueprint />
    </PasswordGate>
  )
}

export default App

