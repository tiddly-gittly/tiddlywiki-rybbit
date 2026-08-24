import { readConfig } from './utils/config';
import { getAnchorUrl, getButtonText, getLinkText, isBinaryDownloadLink } from './utils/dom';
import { getCurrentTrackedTiddlerTitle } from './utils/hash';
import { sendHashPageview } from './utils/track';

/**
 * Startup module: injects Rybbit tracking script into the page <head> once
 * TiddlyWiki has booted, respecting the user-configured enable/disable toggle.
 *
 * Configuration tiddlers (all read at boot time):
 *   $:/plugins/linonetwo/rybbit-analytics/configs/enabled      – "yes" | ""
 *   $:/plugins/linonetwo/rybbit-analytics/configs/script-url   – full URL to script.js
 *   $:/plugins/linonetwo/rybbit-analytics/configs/site-id      – numeric site id string
 *   $:/plugins/linonetwo/rybbit-analytics/configs/skip-patterns – JSON array string
 */

declare const exports: {
  name: string;
  platforms: string[];
  after: string[];
  synchronous: boolean;
  startup: () => void;
};

interface RybbitGlobal {
  event: (name: string, properties?: Record<string, unknown>) => void;
}

const BUTTON_CLICK_EVENT_NAME = 'button-click';
const DOWNLOAD_CLICK_EVENT_NAME = 'download-click';

const trackDownloadClick = (target: EventTarget | null): void => {
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (!isBinaryDownloadLink(anchor)) return;

  const rybbit = (window as unknown as { rybbit?: RybbitGlobal }).rybbit;
  if (!rybbit?.event) return;

  const url = getAnchorUrl(anchor);
  if (!url) return;

  const text = getLinkText(anchor);
  const tiddler = getCurrentTrackedTiddlerTitle();
  rybbit.event(DOWNLOAD_CLICK_EVENT_NAME, {
    text: text || url.pathname.split('/').pop() || 'download',
    href: url.pathname,
    ...(tiddler ? { tiddler } : {}),
  });

  if (tiddler) {
    void sendHashPageview(tiddler);
  }
};

const trackButtonClick = (target: EventTarget | null): void => {
  if (!(target instanceof Element)) return;

  const clickable = target.closest('button, [role="button"], input[type="button"], input[type="submit"]');
  if (!clickable) return;

  const text = getButtonText(clickable);
  if (!text) return;

  const rybbit = (window as unknown as { rybbit?: RybbitGlobal }).rybbit;
  if (!rybbit?.event) return;

  const tiddler = getCurrentTrackedTiddlerTitle();
  rybbit.event(BUTTON_CLICK_EVENT_NAME, {
    text,
    tagName: clickable.tagName.toLowerCase(),
    ...(tiddler ? { tiddler } : {}),
  });
};

exports.name = 'rybbit-analytics';
exports.platforms = ['browser'];
exports.after = ['startup'];
exports.synchronous = true;

exports.startup = () => {
  const enabled = readConfig('enabled');
  if (enabled !== 'yes') return;

  const scriptUrl = readConfig('script-url');
  const siteId = readConfig('site-id');

  if (!scriptUrl || !siteId) return;

  const script = document.createElement('script');
  script.src = scriptUrl;
  script.async = true;
  script.defer = true;
  script.addEventListener('load', () => {
    document.dispatchEvent(new CustomEvent('rybbit-ready'));
  });
  script.setAttribute('data-site-id', siteId);
  script.setAttribute('data-auto-track-spa', 'false');

  const skipPatterns = readConfig('skip-patterns');
  if (skipPatterns) {
    script.setAttribute('data-skip-patterns', skipPatterns);
  }

  document.head.append(script);

  document.addEventListener('click', (event: Event) => {
    trackButtonClick(event.target);
    trackDownloadClick(event.target);
  }, true);
};
