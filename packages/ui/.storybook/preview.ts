import type { Preview } from '@storybook/react-vite';
import '../src/styles/theme.css';

// This import is the concrete proof that a real Vite+React consumer can render every
// component purely through packages/ui's theme — no app-level hardcoded colors needed
// (apps/dashboard doesn't exist yet to demonstrate this against directly, WAYLI-24).
const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error',
    },
  },
};

export default preview;
