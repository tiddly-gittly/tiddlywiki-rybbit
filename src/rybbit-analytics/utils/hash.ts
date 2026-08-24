const STORY_LIST_TITLE = '$:/StoryList';
const DEFAULT_TIDDLERS_TITLE = '$:/DefaultTiddlers';

type TiddlyWikiWindow = {
  $tw?: {
    wiki?: {
      getTiddlerList?: (title: string) => string[];
      getTiddlerText?: (title: string) => string | undefined;
    };
  };
};

export const normalizeTrackedTiddlerTitle = (title: string): string => {
  const normalized = title.trim();
  if (!normalized) return '';

  const separatorIndex = normalized.indexOf(':');
  if (separatorIndex === -1) return normalized;

  return normalized.slice(0, separatorIndex).trim();
};

export const getStoryFocusTiddlerTitle = (): string => {
  try {
    const tw = (window as TiddlyWikiWindow).$tw;
    const storyList = tw?.wiki?.getTiddlerList?.(STORY_LIST_TITLE);
    if (Array.isArray(storyList) && storyList.length > 0) {
      return normalizeTrackedTiddlerTitle(storyList[storyList.length - 1]);
    }
  } catch {
    // Tracking should never interfere with wiki navigation.
  }
  return '';
};

export const getDefaultStartupTiddlerTitle = (): string => {
  try {
    const tw = (window as TiddlyWikiWindow).$tw;
    const defaultTiddlers = tw?.wiki?.getTiddlerText?.(DEFAULT_TIDDLERS_TITLE)?.trim();
    if (!defaultTiddlers) return '';

    const firstDefault = defaultTiddlers.split(/\s+/).find(Boolean);
    return firstDefault ? normalizeTrackedTiddlerTitle(firstDefault) : '';
  } catch {
    return '';
  }
};

export const getCurrentTrackedTiddlerTitle = (): string => {
  const rawHash = window.location.hash.replace(/^#/, '').trim();
  if (rawHash) {
    try {
      return normalizeTrackedTiddlerTitle(decodeURIComponent(rawHash));
    } catch {
      return normalizeTrackedTiddlerTitle(rawHash);
    }
  }

  return getStoryFocusTiddlerTitle() || getDefaultStartupTiddlerTitle();
};
