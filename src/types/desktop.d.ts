/**
 * Desktop shell bridges, injected by electron/preload.cjs.
 *
 * `__printcore_desktop` is exposed synchronously through contextBridge before
 * the document parses (used for instant detection); `printcore` carries the
 * actual window-control operations. Both are absent in the browser build, which
 * is how components detect the shell.
 */
export interface DesktopFlag {
  platform: string;
}

export interface DesktopBridge {
  isDesktop: true;
  platform: string;
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;
  };
}

declare global {
  interface Window {
    __printcore_desktop?: DesktopFlag;
    printcore?: DesktopBridge;
  }
}
