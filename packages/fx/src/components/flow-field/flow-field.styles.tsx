import { tv } from '../../utils/tv'

/**
 * Slot class map for {@link FlowField}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * - `root` is the always-dark stage (`data-theme="dark"` is pinned by the logic) and lays the
 *   children out as a centred column over the field. `group/fx` lets the layers react to the
 *   loop's `data-state`.
 * - `stage` holds every effect layer behind the children (`-z-10` inside the isolated root).
 * - `poster` (`flow-field-poster`, src/styles/flow-field.css) is the server/no-JS still; it fades
 *   out once the loop has drawn (`running`, `paused`, `still`), and comes back on `off`.
 * - `canvas` (the trails) and `glow` (a 1/3-resolution copy, blurred and screened) fade in then.
 * - `scrim` (`flow-field-scrim`) darkens the centre, the bottom edge and the corners.
 */
export const flowFieldStyles = tv({
  slots: {
    // DECISION(open): FlowField stage color — the mockup's #050506 stage has no token; the stage
    // and the canvas's trail fade use --sk-well (#000 in dark). docs/component-flow-field.md § 11.
    root: 'group/fx relative isolate flex min-h-80 flex-col items-center justify-center overflow-hidden bg-well text-text',
    stage: 'pointer-events-none absolute inset-0 -z-10',
    poster:
      'absolute inset-0 flow-field-poster transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-0 group-data-[state=paused]/fx:opacity-0 group-data-[state=still]/fx:opacity-0',
    canvas:
      'absolute inset-0 block size-full opacity-0 transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
    glow: 'absolute inset-0 block size-full opacity-0 mix-blend-screen blur-[6px] transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
    scrim: 'absolute inset-0 flow-field-scrim',
  },
})
