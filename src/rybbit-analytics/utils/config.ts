declare const $tw: {
  wiki: {
    getTiddlerText(title: string, defaultText?: string): string | undefined;
  };
};

const CONFIG_PREFIX = '$:/plugins/linonetwo/rybbit-analytics/configs/';

export const readConfig = (name: string): string => ($tw.wiki.getTiddlerText(`${CONFIG_PREFIX}${name}`) ?? '').trim();

export const getAnalyticsHost = (): string => {
  const scriptUrl = readConfig('script-url');
  return scriptUrl.replace(/\/api\/script\.js(?:\?.*)?$/i, '').replace(/\/+$/, '');
};

export const getTrackUrl = (): string => `${getAnalyticsHost()}/api/track`;
