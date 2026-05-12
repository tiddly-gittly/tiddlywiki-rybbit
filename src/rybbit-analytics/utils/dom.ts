const DOWNLOAD_FILE_EXTENSIONS = /\.(?:apk|appimage|dmg|deb|exe|msi|pkg|rpm|zip|7z|tar|gz|bz2|xz)$/i;

export const normalizeInlineText = (value: string): string => value.replace(/\s+/g, ' ').trim().slice(0, 120);

export const getButtonText = (element: Element): string => {
  const ariaLabel = normalizeInlineText(element.getAttribute('aria-label') ?? '');
  if (ariaLabel) return ariaLabel;

  if (element instanceof HTMLInputElement) {
    const inputValue = normalizeInlineText(element.value);
    if (inputValue) return inputValue;
  }

  const textContent = normalizeInlineText(element.textContent || '');
  if (textContent) return textContent;

  return normalizeInlineText(element.getAttribute('title') ?? '');
};

export const getLinkText = (element: HTMLAnchorElement): string => {
  const ariaLabel = normalizeInlineText(element.getAttribute('aria-label') ?? '');
  if (ariaLabel) return ariaLabel;

  const textContent = normalizeInlineText(element.textContent || '');
  if (textContent) return textContent;

  return normalizeInlineText(element.getAttribute('title') ?? '');
};

export const getAnchorUrl = (element: HTMLAnchorElement): URL | undefined => {
  try {
    return new URL(element.getAttribute('href') || '', window.location.href);
  } catch {
    return undefined;
  }
};

export const isBinaryDownloadLink = (element: HTMLAnchorElement): boolean => {
  const url = getAnchorUrl(element);
  if (!url) return false;

  return url.pathname.includes('/files/') || DOWNLOAD_FILE_EXTENSIONS.test(url.pathname);
};
