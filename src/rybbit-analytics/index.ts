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

const CONFIG_PREFIX = '$:/plugins/linonetwo/rybbit-analytics/configs/';

const readConfig = (name: string): string =>
  ($tw.wiki.getTiddlerText(`${CONFIG_PREFIX}${name}`) ?? '').trim();

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
  script.setAttribute('data-site-id', siteId);

  const skipPatterns = readConfig('skip-patterns');
  if (skipPatterns) {
    script.setAttribute('data-skip-patterns', skipPatterns);
  }

  document.head.append(script);
};
