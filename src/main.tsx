import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from '@/App'
import { store } from '@/app/store/store'

// Mantine's stylesheets must load before ours so Tailwind utilities and our own
// base layer win on equal specificity.
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@/index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error("Root element with id 'root' was not found in index.html.")
}

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
)
