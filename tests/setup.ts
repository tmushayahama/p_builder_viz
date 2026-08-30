import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Testing Library's findBy*/waitFor default to 1000ms, independent of Vitest's own
// test timeout. Mounting the shell renders 14 phases plus five lazily loaded
// reports, which takes ~5s in jsdom on its own and longer while 48 test files run
// in parallel and compete for CPU. At the default, slow renders surfaced as
// "unable to find element" - a missing-element error for a timing problem, which
// is what made these look like product bugs.
configure({ asyncUtilTimeout: 30_000 })

// jsdom lacks window.matchMedia; MantineProvider's colour-scheme logic calls it
// on mount, so every component test needs this stub to render at all.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom lacks ResizeObserver; several Mantine components (Textarea autosize,
// ScrollArea) observe their own size.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom lacks Element.prototype.scrollIntoView.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
