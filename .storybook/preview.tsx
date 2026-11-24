import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { DisplayModal } from '../src/components/modal/DisplayModal'
import { ModalProvider } from '../src/context/ModalContext'
import { PageProvider } from '../src/context/PageContext'
import { THEMES } from '../src/lib/appearance'
import { MockFinanceProvider } from '../src/stories/mocks/MockFinanceProvider'
import '../src/index.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Tema do app',
      toolbar: {
        title: 'Tema',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: THEMES.map((theme) => ({ value: theme.id, title: theme.label })),
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (Story, context) => {
      // Mesmo mecanismo do app: o tema vive em data-theme no <html>.
      document.documentElement.dataset.theme = String(context.globals.theme ?? 'dark')
      document.documentElement.dataset.layout = 'classic'
      const route = (context.parameters.route as string | undefined) ?? '/'
      // Mesma árvore de providers do App, mas com dados fictícios no lugar do Supabase.
      return (
        <MemoryRouter initialEntries={[route]}>
          <MockFinanceProvider>
            <PageProvider>
              <ModalProvider>
                <div className="min-h-screen bg-canvas p-6 text-white">
                  <Story />
                </div>
                <DisplayModal />
              </ModalProvider>
            </PageProvider>
          </MockFinanceProvider>
        </MemoryRouter>
      )
    },
  ],
  parameters: {
    layout: 'fullscreen',
    options: {
      // Taxonomia: Introdução > Tokens (fundamentos) > Componentes (peças) > Telas (composições).
      storySort: {
        order: ['Introdução', 'Tokens', 'Componentes', 'Telas'],
        method: 'alphabetical',
      },
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: 'todo' },
  },
}

export default preview
