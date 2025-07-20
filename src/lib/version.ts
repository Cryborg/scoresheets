import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const APP_NAME = packageJson.name;

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    name: APP_NAME,
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
  };
}