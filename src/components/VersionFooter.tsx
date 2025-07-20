'use client';

import { APP_VERSION, APP_NAME } from '@/lib/version';

export default function VersionFooter() {
  return (
    <footer className="fixed bottom-2 left-2 text-xs text-gray-400 dark:text-gray-600 z-10">
      {APP_NAME} v{APP_VERSION}
    </footer>
  );
}