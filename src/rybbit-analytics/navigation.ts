import { readConfig } from './utils/config';
import { getCurrentTrackedTiddlerTitle, normalizeTrackedTiddlerTitle } from './utils/hash';
import { sendHashPageview } from './utils/track';

/**
 * Startup module: hooks TiddlyWiki's story river navigation to send
 * per-tiddler pageview events to Rybbit.
 *
 * Why: TiddlyWiki is a SPA where multiple tiddlers can be open simultaneously.
 * The browser URL hash only reflects the *last* navigated tiddler, so Rybbit's
 * built-in hashchange tracking double-counts or misses views.
 *
 * This module:
 *  1. Disables Rybbit's own SPA auto-tracking (data-auto-track-spa=false on script).
 *  2. Listens to TW's internal `tw-navigate` browser event.
 *  3. Sends a `pageview` for each tiddler the user navigates to.
 *  4. Optionally fires a custom `tiddler-open` event with the tiddler title.
 */

declare const exports: {
  name: string;
  platforms: string[];
  after: string[];
  synchronous: boolean;
  startup: () => void;
};

const RYBBIT_READY_EVENT_NAME = 'rybbit-ready';
const SAME_TIDDLER_DEDUP_WINDOW_MS = 1500;

let lastTrackedTiddler = '';
let lastTrackedAt = 0;

const trackTiddlerView = (tiddlerTitle: string, _source: 'initial-load' | 'tw-navigate' | 'hashchange') => {
  const normalizedTiddlerTitle = normalizeTrackedTiddlerTitle(tiddlerTitle);
  if (!normalizedTiddlerTitle) return;

  const now = Date.now();
  if (normalizedTiddlerTitle === lastTrackedTiddler && now - lastTrackedAt < SAME_TIDDLER_DEDUP_WINDOW_MS) {
    return;
  }

  const rybbit = (window as { rybbit?: unknown }).rybbit;
  if (!rybbit) return;

  lastTrackedTiddler = normalizedTiddlerTitle;
  lastTrackedAt = now;

  void sendHashPageview(normalizedTiddlerTitle);
};

exports.name = 'rybbit-analytics-navigation';
exports.platforms = ['browser'];
exports.after = ['rybbit-analytics']; // run after script injection
exports.synchronous = true;

exports.startup = () => {
  if (readConfig('enabled') !== 'yes') return;
  if (readConfig('navigation-tracking') !== 'yes') return;

  const trackInitialViewWhenReady = () => {
    window.setTimeout(() => {
      trackTiddlerView(getCurrentTrackedTiddlerTitle(), 'initial-load');
    }, 0);
  };

  if ((window as { rybbit?: unknown }).rybbit) {
    trackInitialViewWhenReady();
  } else {
    document.addEventListener(RYBBIT_READY_EVENT_NAME, trackInitialViewWhenReady, { once: true });
  }

  document.addEventListener('tw-navigate', (rawEvent: Event) => {
    const event = rawEvent as CustomEvent<{ navigateTo?: string }>;
    const tiddlerTitle = event.detail.navigateTo;
    if (!tiddlerTitle) return;

    setTimeout(() => {
      trackTiddlerView(tiddlerTitle, 'tw-navigate');
    }, 0);
  });

  window.addEventListener('hashchange', () => {
    window.setTimeout(() => {
      trackTiddlerView(getCurrentTrackedTiddlerTitle(), 'hashchange');
    }, 0);
  });
};
