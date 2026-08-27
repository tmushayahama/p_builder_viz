import { Button } from '@mantine/core'
import { useAppSelector } from '@/app/hooks'
import { selectColorScheme } from '@/app/slices/uiSlice'

/**
 * Placeholder route. It exercises the three things that break first when the
 * stack is misconfigured — a Mantine component, a Tailwind utility, and a typed
 * store read — so `npm run dev` either looks right or fails visibly.
 */
const HomePage = () => {
  const colorScheme = useAppSelector(selectColorScheme)

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Stack is wired</h2>
      <p className="max-w-prose text-sm opacity-70">
        React 19, TypeScript, Vite, Mantine v9, Tailwind v4 and Redux Toolkit are installed and
        talking to each other. Replace this route with the real application.
      </p>
      <div className="flex items-center gap-3 rounded border border-black/10 p-4 dark:border-white/10">
        <Button variant="light">Mantine button</Button>
        <span className="text-sm">
          colour scheme from the store: <code>{colorScheme}</code>
        </span>
      </div>
    </section>
  )
}

export default HomePage
