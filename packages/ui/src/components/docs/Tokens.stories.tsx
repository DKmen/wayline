import type { Meta, StoryObj } from '@storybook/react-vite';

// Tailwind statically scans source for literal class names — a template-literal
// `bg-${name}` string is invisible to it, so every swatch needs its class spelled out.
const COLOR_SWATCHES = [
  { name: '--background', label: 'Background (mist)', swatchClassName: 'bg-background' },
  { name: '--foreground', label: 'Foreground (ink)', swatchClassName: 'bg-foreground' },
  { name: '--primary', label: 'Primary (way-blue)', swatchClassName: 'bg-primary' },
  { name: '--secondary', label: 'Secondary', swatchClassName: 'bg-secondary' },
  { name: '--muted', label: 'Muted', swatchClassName: 'bg-muted' },
  { name: '--accent', label: 'Accent', swatchClassName: 'bg-accent' },
  { name: '--destructive', label: 'Destructive (danger)', swatchClassName: 'bg-destructive' },
  { name: '--success', label: 'Success', swatchClassName: 'bg-success' },
  { name: '--warning', label: 'Warning (amber)', swatchClassName: 'bg-warning' },
  { name: '--border', label: 'Border', swatchClassName: 'bg-border' },
] as const;

/** Renders every brand color token as a labeled swatch — the visual baseline for the token system itself. */
function TokenSwatches() {
  return (
    <div className="grid grid-cols-2 gap-4 p-6 font-sans sm:grid-cols-3">
      {COLOR_SWATCHES.map((token) => (
        <div key={token.name} className="flex flex-col gap-2">
          <div className={`h-16 rounded-lg border border-border ${token.swatchClassName}`} />
          <div>
            <p className="text-sm font-medium text-foreground">{token.label}</p>
            <p className="font-mono text-xs text-muted-foreground">{token.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Renders the two typefaces at their documented weights (docs/05 §1). */
function TypographySpecimen() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <p className="font-sans text-2xl font-semibold text-foreground">
        Instrument Sans 600 — headings
      </p>
      <p className="font-sans text-base font-medium text-foreground">
        Instrument Sans 500 — emphasis body
      </p>
      <p className="font-sans text-base font-normal text-foreground">
        Instrument Sans 400 — body text
      </p>
      <p className="font-mono text-sm text-foreground">
        JetBrains Mono 400 — https://wayline.app/f/abc123
      </p>
    </div>
  );
}

const meta = {
  title: 'Docs/Tokens',
  component: TokenSwatches,
} satisfies Meta<typeof TokenSwatches>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {};
export const Typography: Story = { render: () => <TypographySpecimen /> };
