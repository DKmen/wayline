import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Published v3' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', children: 'Draft · local' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Render failed' } };
// Amber is a non-text border accent only (docs/05 WCAG gap) — always paired with a
// warning icon in real usage; this story renders the icon-paired form, not bare text.
export const Warning: Story = {
  args: { variant: 'warning', children: '⚠ 2 warnings' },
};
export const Outline: Story = { args: { variant: 'outline', children: 'Beta' } };
