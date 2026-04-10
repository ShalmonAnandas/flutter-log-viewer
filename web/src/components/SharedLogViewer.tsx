'use client';

import { parseFlutterLog } from '@/lib/logParser';
import LogViewerApp from './LogViewerApp';

export default function SharedLogViewer({ logContent, shareId }: { logContent: string; shareId: string }) {
  const parsed = parseFlutterLog(logContent);

  return (
    <LogViewerApp
      initialParsedLog={parsed}
      shareId={shareId}
      isShared={true}
    />
  );
}
