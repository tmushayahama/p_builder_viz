import { ActionIcon, Button, Select, TextInput, Tooltip, createTheme } from '@mantine/core'

/**
 * Mantine theme for the app.
 *
 * Component defaults live here rather than being repeated at every call site, so
 * control sizing stays consistent as the app grows. Colour belongs to Mantine's
 * own scheme handling — `src/index.css` bridges the page surface to it instead of
 * declaring a competing palette.
 */
export const mantineTheme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'sm',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI Variable Display", "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, "Cascadia Mono", "Cascadia Code", Consolas, "SF Mono", Menlo, monospace',
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  headings: { fontWeight: '600' },
  components: {
    Button: Button.extend({
      defaultProps: { size: 'xs' },
      styles: { root: { textTransform: 'none' } },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: 'subtle', color: 'gray' },
    }),
    TextInput: TextInput.extend({ defaultProps: { size: 'xs' } }),
    Select: Select.extend({
      defaultProps: { size: 'xs', allowDeselect: false, comboboxProps: { withinPortal: true } },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: { withArrow: true, openDelay: 200 },
    }),
  },
})
