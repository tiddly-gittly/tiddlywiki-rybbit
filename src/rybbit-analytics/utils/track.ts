import { getTrackUrl, readConfig } from './config';

const DEFAULT_TRACK_TIMEOUT_MS = 5000;

const getBrowserScore = (): number => {
  let score = 0;
  try {
    if (navigator.webdriver) score += 1;
    if (window.outerHeight === 0 || window.outerWidth === 0) score += 1;
  } catch {
    return score;
  }
  return score;
};

export const sendHashPageview = async (tiddlerTitle: string): Promise<void> => {
  if (!tiddlerTitle) return;

  const siteId = readConfig('site-id');
  if (!siteId) return;

  const payload = {
    site_id: siteId,
    type: 'pageview',
    hostname: window.location.hostname,
    pathname: tiddlerTitle,
    querystring: window.location.search,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    page_title: document.title,
    referrer: document.referrer,
    _bs: getBrowserScore(),
  };

  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => {
    controller.abort();
  }, DEFAULT_TRACK_TIMEOUT_MS);

  try {
    await fetch(getTrackUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
    });
  } catch {
    // Tracking should never interfere with reading or navigation flows.
  } finally {
    window.clearTimeout(timeoutHandle);
  }
};
