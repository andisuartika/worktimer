import { createRoot } from 'react-dom/client'
import './index.css'

import './index.css'
import WorkTimer from './timer.tsx'


createRoot(document.getElementById('root')!).render(
  <WorkTimer homeAt={{ hours: 16, minutes: 0, label: "Waktunya pulang" }} />

)
