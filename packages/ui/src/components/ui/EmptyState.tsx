import * as React from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps extends React.ComponentProps<'div'> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Wayline's "nothing here yet" primitive — the first empty-state surface in the library. */
function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <p className="text-base font-medium text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
