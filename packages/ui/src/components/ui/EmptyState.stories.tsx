import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: { title: 'No flows yet' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { description: 'Flow capture is coming soon.' },
};
export const WithAction: Story = {
  args: {
    description: 'Flow capture is coming soon.',
    action: <Button>Record a flow</Button>,
  },
};
