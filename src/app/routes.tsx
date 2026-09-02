import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/app/layout/AppLayout'
import BuildShell from '@/app/layout/BuildShell'
import ReleaseView from '@/features/release/components/ReleaseView'
import { BUILD_ROUTE, RELEASE_ROUTE } from '@/features/build/model'

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
        // A second lens on the same report. The record keeps `/`: whoever watches a build opens
        // this app far more often than whoever reviews a release, and every existing deep link
        // and diagnostic anchor already points into the record.
        { path: RELEASE_ROUTE.replace(/^\//, ''), element: <ReleaseView /> },
        { path: '*', element: <BuildShell /> },
      ],
    },
  ],
  { basename: import.meta.env.VITE_BASE_URL }
)
