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
      const logBlob = blobs.find(b => b.pathname === `logs/${id}.txt`) || blobs.find(b => b.pathname.endsWith('.txt'));
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
