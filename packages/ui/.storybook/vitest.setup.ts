import { setProjectAnnotations } from '@storybook/react-vite';
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { beforeAll, beforeEach } from 'vitest';
import * as projectAnnotations from './preview';

// Storybook's own runtime hint says this call is unnecessary since 10.3 auto-applies
// preview annotations — removing it actually broke rendering entirely ("no render
// function available"), so the working, verified configuration is kept as-is; the hint
// appears to describe a setup without a custom setupFile at all, not this one.
const annotations = setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);

beforeAll(annotations.beforeAll);

// Radix's DismissableLayer sets document.body.style.pointerEvents = 'none' while a
// layer (Dialog/DropdownMenu, added in a later ticket) is active; the cleanup that
// restores it can race with the next story's play function. Reset defensively now so
// this doesn't silently break once those primitives land.
beforeEach(() => {
  document.body.style.pointerEvents = '';
});
