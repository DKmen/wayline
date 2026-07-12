import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Publish flow' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: 'outline' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete flow' } };
export const Link: Story = {
  args: { variant: 'link' },
  // Known, accepted gap (docs/05, user-confirmed): way-blue text on the mist background
  // measures 4.45:1 vs the 4.5:1 AA floor — real PDF-approved brand color, kept as-is
  // rather than redesigned. Reported, not merge-blocking.
  parameters: { a11y: { test: 'todo' } },
};
export const Disabled: Story = { args: { disabled: true } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
