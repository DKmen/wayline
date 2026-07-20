/** Visually hidden until focused — lets keyboard users jump past the nav straight to content. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
    >
      Skip to main content
    </a>
  );
}
