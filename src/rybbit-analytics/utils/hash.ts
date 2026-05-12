export const normalizeTrackedTiddlerTitle = (title: string): string => {
  const normalized = title.trim();
  if (!normalized) return '';

  const separatorIndex = normalized.indexOf(':');
  if (separatorIndex === -1) return normalized;

  return normalized.slice(0, separatorIndex).trim();
};

export const getCurrentTrackedTiddlerTitle = (): string => {
  const rawHash = window.location.hash.replace(/^#/, '').trim();
  if (!rawHash) return '';

  try {
    return normalizeTrackedTiddlerTitle(decodeURIComponent(rawHash));
  } catch {
    return normalizeTrackedTiddlerTitle(rawHash);
  }
};
