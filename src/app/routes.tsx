import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/app/layout/AppLayout'
import HomePage from '@/features/home/components/HomePage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [{ index: true, element: <HomePage /> }],
    },
  ],
  { basename: import.meta.env.VITE_BASE_URL }
)
