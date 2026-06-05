/**
 * Node.js-side startup module for default-template-usage-analytics.
 *
 * Computes tiddler statistics in the Node.js wiki worker (not the browser UI
 * thread) to avoid blocking rendering. Fires after a random 8-12 minute
 * delay so it does not compete with startup I/O.
 *
 * Event emitted:
 *   plugin.default-template-usage-analytics.wiki_stats
 *
 * Properties:
 *   user_tiddler_count  - number of non-system, non-draft tiddlers
 *   size_total_chars    - total character count across all user tiddlers
 *   size_mean_chars     - mean tiddler size in chars
 *   size_median_chars   - median tiddler size in chars
 *   size_max_chars      - largest single tiddler size in chars
 *   size_top10_mean     - mean size of the 10 largest tiddlers
 *   plugin_count        - number of installed plugins (same as startup event)
 *
 * No tiddler titles or content is ever included.
 */

declare const exports: {
  name: string;
  platforms: string[];
  after: string[];
  synchronous: boolean;
  startup: () => void;
};

const PLUGIN_ID = 'default-template-usage-analytics';
// Random delay between 8 and 12 minutes after boot.
const MIN_DELAY_MS = 8 * 60 * 1000;
const MAX_DELAY_MS = 12 * 60 * 1000;

type TrackFunction = (pluginId: string, eventName: string, properties?: Record<string, string | number | boolean>) => Promise<void>;

const computeStats = (): Record<string, number> => {
  const sizes: number[] = [];
  let pluginCount = 0;

  $tw.wiki.each((tiddler, title) => {
    // Count installed plugins
    if (title.startsWith('$:/plugins/') && tiddler.fields['plugin-type'] === 'plugin') {
      pluginCount++;
      return;
    }
    // User tiddlers: skip system, drafts, and binary/non-text types
    if (title.startsWith('$:/')) return;
    if (tiddler.fields['draft.of']) return;
    const text: string = typeof tiddler.fields.text === 'string' ? tiddler.fields.text : '';
    sizes.push(text.length);
  });

  if (sizes.length === 0) {
    return { user_tiddler_count: 0, size_total_chars: 0, size_mean_chars: 0, size_median_chars: 0, size_max_chars: 0, size_top10_mean: 0, plugin_count: pluginCount };
  }

  sizes.sort((firstValue, secondValue) => secondValue - firstValue);

  const total = sizes.reduce((accumulator, value) => accumulator + value, 0);
  const mean = Math.round(total / sizes.length);
  const median = sizes.length % 2 === 0
    ? Math.round((sizes[sizes.length / 2 - 1] + sizes[sizes.length / 2]) / 2)
    : sizes[Math.floor(sizes.length / 2)];
  const top10 = sizes.slice(0, Math.min(10, sizes.length));
  const top10Mean = Math.round(top10.reduce((accumulator, value) => accumulator + value, 0) / top10.length);

  return {
    user_tiddler_count: sizes.length,
    size_total_chars: total,
    size_mean_chars: mean,
    size_median_chars: median,
    size_max_chars: sizes[0],
    size_top10_mean: top10Mean,
    plugin_count: pluginCount,
  };
};

exports.name = 'default-template-usage-analytics-stats';
exports.platforms = ['node'];
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

  const delayMs = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

  setTimeout(() => {
    const stats = computeStats();
    void track(PLUGIN_ID, 'wiki_stats', stats);
  }, delayMs);
};
