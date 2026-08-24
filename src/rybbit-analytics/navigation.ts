import { readConfig } from './utils/config';
import {
  getCurrentTrackedTiddlerTitle,
  getStoryFocusTiddlerTitle,
  normalizeTrackedTiddlerTitle,
} from './utils/hash';
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
 *  2. Listens to TW's internal `tm-navigate` widget event and StoryList changes.
 *  3. Sends a `pageview` for each tiddler the user navigates to.
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
const STORY_LIST_TITLE = '$:/StoryList';

type NavigateEvent = {
  navigateTo?: string;
};

type TiddlyWikiWindow = {
  $tw?: {
    rootWidget?: {
      addEventListener?: (type: string, handler: (event: NavigateEvent) => void) => void;
    };
    wiki?: {
      addEventListener?: (type: string, handler: (changes: Record<string, string[]>) => void) => void;
    };
  };
};

let lastTrackedTiddler = '';
let lastTrackedAt = 0;

const trackTiddlerView = (tiddlerTitle: string, _source: string) => {
  const normalizedTiddlerTitle = normalizeTrackedTiddlerTitle(tiddlerTitle);
  if (!normalizedTiddlerTitle) return;

  const now = Date.now();
  if (normalizedTiddlerTitle === lastTrackedTiddler && now - lastTrackedAt < SAME_TIDDLER_DEDUP_WINDOW_MS) {
    return;
  }

  lastTrackedTiddler = normalizedTiddlerTitle;
  lastTrackedAt = now;
  void sendHashPageview(normalizedTiddlerTitle);
};

const hookTiddlyWikiNavigation = () => {
  const tw = (window as TiddlyWikiWindow).$tw;
  if (!tw) return;

  tw.rootWidget?.addEventListener?.('tm-navigate', (event) => {
    if (!event?.navigateTo) return;
    window.setTimeout(() => {
      trackTiddlerView(event.navigateTo!, 'tm-navigate');
    }, 0);
  });

  tw.wiki?.addEventListener?.('change', (changes) => {
    if (!changes?.[STORY_LIST_TITLE]) return;
    window.setTimeout(() => {
      const title = getStoryFocusTiddlerTitle() || getCurrentTrackedTiddlerTitle();
      if (title) {
        trackTiddlerView(title, 'story-list-change');
      }
    }, 0);
  });
};

exports.name = 'rybbit-analytics-navigation';
exports.platforms = ['browser'];
exports.after = ['rybbit-analytics'];
exports.synchronous = true;

exports.startup = () => {
  if (readConfig('enabled') !== 'yes') return;
  if (readConfig('navigation-tracking') !== 'yes') return;

  const trackInitialViewWhenReady = () => {
    window.setTimeout(() => {
      hookTiddlyWikiNavigation();
      trackTiddlerView(getCurrentTrackedTiddlerTitle(), 'initial-load');
    }, 0);
  };

  if ((window as { rybbit?: unknown }).rybbit) {
    trackInitialViewWhenReady();
  } else {
    document.addEventListener(RYBBIT_READY_EVENT_NAME, trackInitialViewWhenReady, { once: true });
  }

  window.addEventListener('hashchange', () => {
    window.setTimeout(() => {
      trackTiddlerView(getCurrentTrackedTiddlerTitle(), 'hashchange');
    }, 0);
  });
};
