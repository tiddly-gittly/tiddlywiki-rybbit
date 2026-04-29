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

declare const $tw: {
  wiki: {
    getTiddlerText(title: string, defaultText?: string): string | undefined;
  };
};

interface RybbitGlobal {
  pageview: () => void;
  event: (name: string, properties?: Record<string, unknown>) => void;
}

const CONFIG_PREFIX = '$:/plugins/linonetwo/rybbit-analytics/configs/';
const readConfig = (name: string): string =>
  ($tw.wiki.getTiddlerText(`${CONFIG_PREFIX}${name}`) ?? '').trim();

exports.name = 'rybbit-analytics-navigation';
exports.platforms = ['browser'];
exports.after = ['rybbit-analytics']; // run after script injection
exports.synchronous = true;

exports.startup = () => {
  if (readConfig('enabled') !== 'yes') return;
  if (readConfig('navigation-tracking') !== 'yes') return;

  // Patch the injected script tag to disable Rybbit's own SPA tracking,
  // since we handle navigation ourselves for accuracy.
  // We do this before the script executes by setting the attribute early;
  // if the script already loaded, the flag is a no-op but our hook takes over.
  const scriptEl = document.querySelector(
    'script[data-site-id]',
  ) as HTMLScriptElement | null;
  if (scriptEl) {
    scriptEl.setAttribute('data-auto-track-spa', 'false');
  }

  // Listen for TiddlyWiki navigation events
  document.addEventListener('tw-navigate', (rawEvent: Event) => {
    const event = rawEvent as CustomEvent<{ navigateTo?: string }>;
    const tiddlerTitle = event.detail?.navigateTo;
    if (!tiddlerTitle) return;

    // Wait one tick so the URL hash has updated before Rybbit reads it
    setTimeout(() => {
      const rybbit = (window as unknown as { rybbit?: RybbitGlobal }).rybbit;
      if (!rybbit) return;

      // Send standard pageview (uses current URL/hash)
      rybbit.pageview();

      // Also send a richer custom event with the tiddler title
      rybbit.event('tiddler-open', { tiddler: tiddlerTitle });
    }, 0);
  });
};
