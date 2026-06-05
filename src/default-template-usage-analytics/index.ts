/**
 * Browser-side startup module for default-template-usage-analytics.
 *
 * Instruments the TidGi Desktop default wiki automatically:
 *   - Fires one event per user action (new/save/delete tiddler, search)
 *   - Fires feature_used once per named feature per session
 *   - Fires layout_used when the user switches layouts (reports the owning plugin)
 *   - Sends an activity heartbeat every HEARTBEAT_MINUTES when there is activity
 *
 * Heavy stats (tiddler counts, size distribution) run in the Node.js startup
 * module (stats.ts) to avoid blocking the UI thread.
 *
 * To disable: uninstall the plugin or turn off analytics in TidGi preferences
 * (Preferences > Privacy & Analytics).
 */

declare const exports: {
  name: string;
  platforms: string[];
  after: string[];
  synchronous: boolean;
  startup: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLUGIN_ID = 'default-template-usage-analytics';
const HEARTBEAT_MINUTES = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TrackFunction = (pluginId: string, eventName: string, properties?: Record<string, string | number | boolean>) => Promise<void>;

/**
 * Derive a Rybbit-safe property key from a plugin tiddler title.
 * "$:/plugins/flibbles/relink" -> "flibbles_relink"
 */
const pluginTitleToKey = (title: string): string => {
  const slug = title
    .replace('$:/plugins/', '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, 40);
  return slug || 'unknown';
};

/**
 * Extract the owning plugin slug from a layout tiddler title.
 * "$:/plugins/linonetwo/simple-layout-launcher/layouts/SingleColumn"
 *   -> "linonetwo_simple_layout_launcher"
 * Falls back to the full key if the title does not look like a plugin path.
 */
const layoutToPluginKey = (layoutTitle: string): string => {
  const pluginMatch = /^\$:\/plugins\/([^/]+\/[^/]+)/.exec(layoutTitle);
  if (pluginMatch) {
    return pluginMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  }
  return pluginTitleToKey(layoutTitle);
};

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

exports.name = 'default-template-usage-analytics-browser';
exports.platforms = ['browser'];
exports.after = ['startup'];
exports.synchronous = true;

exports.startup = () => {
  const analyticsService = (
    $tw as unknown as {
      tidgi?: { service?: { analytics?: { trackPluginEvent?: TrackFunction } } };
    }
  ).tidgi?.service?.analytics;
  if (!analyticsService?.trackPluginEvent) return;

  const track: TrackFunction = analyticsService.trackPluginEvent.bind(analyticsService);

  // 1. Startup: dynamically enumerate installed plugins.
  const startupProps: Record<string, string | number | boolean> = {};
  let pluginCount = 0;

  $tw.wiki.each((tiddler, title) => {
    if (title.startsWith('$:/plugins/') && tiddler.fields['plugin-type'] === 'plugin') {
      startupProps[pluginTitleToKey(title)] = true;
      pluginCount++;
    }
  });

  startupProps['plugin_count'] = pluginCount;
  void track(PLUGIN_ID, 'startup', startupProps);

  // 2. Per-action events fired immediately.

  const rootWidget = (
    $tw as unknown as {
      rootWidget: { addEventListener: (type: string, handler: (event: Event) => void) => void };
    }
  ).rootWidget;

  let hadActivity = false;
  const markActivity = () => {
    hadActivity = true;
  };

  rootWidget.addEventListener('tm-new-tiddler', () => {
    markActivity();
    void track(PLUGIN_ID, 'tiddler_created', {});
  });
  rootWidget.addEventListener('tm-save-tiddler', () => {
    markActivity();
    void track(PLUGIN_ID, 'tiddler_saved', {});
  });
  rootWidget.addEventListener('tm-delete-tiddler', () => {
    markActivity();
    void track(PLUGIN_ID, 'tiddler_deleted', {});
  });
  rootWidget.addEventListener('tm-perform-search', () => {
    markActivity();
    void track(PLUGIN_ID, 'search_performed', {});
  });

  // 3. Feature-use: fire once per named feature per session.

  const usedFeatures = new Set<string>();
  const trackFeatureOnce = (feature: string) => {
    if (usedFeatures.has(feature)) return;
    usedFeatures.add(feature);
    markActivity();
    void track(PLUGIN_ID, 'feature_used', { feature });
  };

  $tw.wiki.addEventListener('change', (changes: Record<string, unknown>) => {
    // Layout switch: report which plugin owns the new layout.
    if (changes['$:/layout'] !== undefined) {
      const layoutTitle = $tw.wiki.getTiddlerText('$:/layout', '');
      const pluginKey = layoutTitle ? layoutToPluginKey(layoutTitle) : 'default';
      markActivity();
      void track(PLUGIN_ID, 'layout_used', { layout_plugin: pluginKey });
    }

    if (changes['$:/plugins/linonetwo/commandpalette/open'] !== undefined) {
      trackFeatureOnce('command_palette');
    }
    for (const title of Object.keys(changes)) {
      if (title.startsWith('$:/state/linonetwo/tw-calendar') || title.startsWith('$:/plugins/linonetwo/tw-calendar/config')) {
        trackFeatureOnce('calendar');
        break;
      }
    }
    for (const title of Object.keys(changes)) {
      const tiddler = $tw.wiki.getTiddler(title);
      if (tiddler?.fields.type === 'application/x-tiddler-whiteboard') {
        trackFeatureOnce('whiteboard');
        break;
      }
    }
    for (const title of Object.keys(changes)) {
      if (title.startsWith('$:/plugins/kookma/todolist') && !title.includes('/config')) {
        trackFeatureOnce('todolist');
        break;
      }
    }
    for (const title of Object.keys(changes)) {
      if (title.startsWith('$:/config/kookma/favorites')) {
        trackFeatureOnce('favorites');
        break;
      }
    }
  });

  // 4. Activity-gated heartbeat (replaces unreliable beforeunload).

  let beatNumber = 0;
  setInterval(() => {
    if (!hadActivity) return;
    hadActivity = false;
    beatNumber++;
    void track(PLUGIN_ID, 'active', { beat: beatNumber });
  }, HEARTBEAT_MINUTES * 60 * 1000);
};
