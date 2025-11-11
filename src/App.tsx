import { useState } from 'react'
import { Navigation, type NavItem } from '@/components/Navigation'
import { OverviewView } from '@/components/views/OverviewView'
import { StandardsView } from '@/components/views/StandardsView'
import { PoliciesView } from '@/components/views/PoliciesView'
import { TrainingView } from '@/components/views/TrainingView'
import { StaffView } from '@/components/views/StaffView'
import { FeedbackView } from '@/components/views/FeedbackView'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const [activeView, setActiveView] = useState<NavItem>('overview')

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeView={activeView} onNavigate={setActiveView} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeView === 'overview' && <OverviewView />}
        {activeView === 'standards' && <StandardsView />}
        {activeView === 'policies' && <PoliciesView />}
        {activeView === 'training' && <TrainingView />}
        {activeView === 'staff' && <StaffView />}
        {activeView === 'feedback' && <FeedbackView />}
      </main>

      <Toaster />
    </div>
  )
}

export default App