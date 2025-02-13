import dotenv from 'dotenv';
dotenv.config();

// const CACHE_DURATION = Number(process.env.CACHE_DURATION) || 100;
const BELLEROPHON_CONFIG_QUERY_URL = `${process.env.BELLEROPHON_URL}/aiChatBot/app_configurations/query.json`;
const BELLEROPHON_CONFIG_QUERY_CONFIG = {
  method: 'GET',
  headers: {
    'content-type': 'application/json',
    'Auth-Token': process.env.BELLEROPHON_AUTH_TOKEN || '',
  },
};

const splitObjectKeys = (obj: Record<string, any>, pattern = '.') => {
  const result: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      value = splitObjectKeys(value, pattern);
    }

    const keys = key.split(pattern);
    let currentLevel = result;

    keys.slice(0, -1).forEach(part => {
      if (!currentLevel[part]) currentLevel[part] = {};
      currentLevel = currentLevel[part];
    });

    currentLevel[keys[keys.length - 1]] = value;
  });

  return result;
};

export const getAppConfiguration = async (
  hostName: string
): Promise<any> => {
  const cacheKey = `app_config:${process.env.OVERRIDE_DOMAIN || hostName}`;
  // let appConfiguration = await fetchFromCache(cacheKey);
  let appConfiguration = null;
  if (!appConfiguration) {
    if (process.env.BELLEROPHON_URL && process.env.BELLEROPHON_AUTH_TOKEN) {
      const params = new URLSearchParams({
        customer_domain: process.env.OVERRIDE_DOMAIN || hostName,
      });
      const url = `${BELLEROPHON_CONFIG_QUERY_URL}?${params.toString()}`;
      const response = await fetch(url, BELLEROPHON_CONFIG_QUERY_CONFIG);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch app configuration: ${response.statusText}`
        );
      }

      appConfiguration = await response.json();
      appConfiguration = splitObjectKeys(appConfiguration);
      // await setToCache(cacheKey, appConfiguration, CACHE_DURATION);
      return appConfiguration;
    } else {
      console.log(
        '***** Using default app configuration *****'
      );
      return {};
    }
  } else {
    console.log('***** Using cached app configuration *****');
    return appConfiguration;
  }
};
