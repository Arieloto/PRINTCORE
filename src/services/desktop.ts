/**
 * Desktop shell detection.
 *
 * electron/preload.cjs exposes `window.__printcore_desktop` synchronously via
 * contextBridge (see src/types/desktop.d.ts) before the document parses, so the
 * very first frame already paints the custom title bar. `window.printcore` (the
 * async-safe equivalent) is kept as a fallback. In the browser neither exists,
 * so the title bar is not rendered and the app keeps its normal web chrome.
 *
 * `?titlebar=1` forces the title bar on for visual testing in the browser; in
 * that preview mode the window buttons are inert instead of crashing.
 */

function queryFlag(name: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get(name) === '1';
  } catch {
    return false;
  }
}

export interface DesktopShell {
  active: boolean;
  platform?: string;
}

export function getDesktopShell(): DesktopShell {
  if (typeof window === 'undefined') return { active: false };

  const syncFlag = window.__printcore_desktop;
  if (syncFlag) return { active: true, platform: syncFlag.platform };

  if (window.printcore?.isDesktop) return { active: true, platform: window.printcore.platform };

  return { active: queryFlag('titlebar') };
}
