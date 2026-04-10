import { list } from '@vercel/blob';
import { redirect } from 'next/navigation';
import SharedLogViewer from '@/components/SharedLogViewer';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ u?: string }>;
}

export default async function SharedPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { u } = await searchParams;

  let logContent: string | null = null;

  try {
    const directBlobUrl = u ? decodeURIComponent(u) : null;
    if (directBlobUrl) {
      const response = await fetch(directBlobUrl);
      if (response.ok) {
        logContent = await response.text();
      }
    }

    if (!logContent) {
      const { blobs } = await list({ prefix: `logs/${id}` });
      let logBlob = null;
      for (const blob of blobs) {
        if (blob.pathname === `logs/${id}.txt`) {
          logBlob = blob;
          break;
        }
        if (!logBlob && blob.pathname.endsWith('.txt')) {
          logBlob = blob;
        }
      }
      if (!logBlob) {
        redirect('/');
      }
      const response = await fetch(logBlob.url);
      if (!response.ok) {
        redirect('/');
      }
      logContent = await response.text();
    }
  } catch (error) {
    console.error('Failed to load shared log:', error);
    redirect('/');
  }

  if (!logContent) {
    redirect('/');
  }

  return <SharedLogViewer logContent={logContent} shareId={id} />;
}
