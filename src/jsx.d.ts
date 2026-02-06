/**
 * JSX namespace declaration for Astro components
 * This resolves the TypeScript error about missing JSX.IntrinsicElements interface
 */
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
