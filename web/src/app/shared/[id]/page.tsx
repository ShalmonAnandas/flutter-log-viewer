import { list } from '@vercel/blob';
import { redirect } from 'next/navigation';
import SharedLogViewer from '@/components/SharedLogViewer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharedPage({ params }: PageProps) {
  const { id } = await params;

  let logContent: string | null = null;

  try {
    const { blobs } = await list({ prefix: `logs/${id}` });
    const logBlob = blobs.find(b => b.pathname.endsWith('.txt'));

    if (!logBlob) {
      redirect('/');
    }

    const response = await fetch(logBlob.url);
    logContent = await response.text();
  } catch {
    redirect('/');
  }

  if (!logContent) {
    redirect('/');
  }

  return <SharedLogViewer logContent={logContent} shareId={id} />;
}
