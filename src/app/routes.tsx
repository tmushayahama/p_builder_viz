import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/app/layout/AppLayout'
import BuildShell from '@/app/layout/BuildShell'
import { BUILD_ROUTE } from '@/features/build/model'

/**
 * One route, addressed by hash.
 *
 * The report is a single record and the pipeline is its navigation, so there is no peer-route model
 * mirroring the report's section ids. Every phase, step, report, check, species, config value and
 * metric is addressed by a hash anchor built in the model's `anchors` module, which keeps a link
 * and the element it points at from drifting apart.
 *
 * Unmatched paths render the record rather than redirecting, because a redirect would discard the
 * hash and a deep link is the whole point of the anchors.
 */
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <BuildShell /> },
        { path: BUILD_ROUTE.replace(/^\//, ''), element: <BuildShell /> },
        { path: '*', element: <BuildShell /> },
      ],
    },
  ],
  { basename: import.meta.env.VITE_BASE_URL }
)
