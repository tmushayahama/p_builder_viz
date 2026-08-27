import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { RouterProvider } from 'react-router-dom'
import { MetricDefinitionsProvider } from '@/@panther.core/components'
import { mantineTheme } from '@/@panther.core/theme/mantineTheme'
import { useAppSelector } from '@/app/hooks'
import { metricRegistry } from '@/app/metricRegistry'
import { selectColorScheme } from '@/app/slices/uiSlice'
import { router } from '@/app/routes'

const App = () => {
  // The scheme is driven from the store, so MantineProvider is a controlled
  // consumer of it rather than holding a second copy of the same state.
  const colorScheme = useAppSelector(selectColorScheme)

  return (
    <MantineProvider theme={mantineTheme} forceColorScheme={colorScheme}>
      <MetricDefinitionsProvider registry={metricRegistry}>
        <Notifications />
        <RouterProvider router={router} />
      </MetricDefinitionsProvider>
    </MantineProvider>
  )
}

export default App
