import { Timeline } from './components/Timeline'
import { Map } from './components/Map'
import './App.css'

function App() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Map section */}
      <div className="lg:w-1/2 h-[50vh] min-h-[300px] lg:h-screen">
        <Map className="h-full w-full" />
      </div>
      {/* Timeline section */}
      <div className="lg:w-1/2 overflow-auto">
        <Timeline />
      </div>
    </div>
  )
}

export default App
