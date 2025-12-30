import FamilyWealthBlueprint from './components/FamilyWealthBlueprint'
import PasswordGate from './components/PasswordGate'

function App() {
  return (
    <PasswordGate appName="Family Wealth Blueprint">
      <FamilyWealthBlueprint />
    </PasswordGate>
  )
}

export default App

