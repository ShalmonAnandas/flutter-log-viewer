import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { put, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Login required to save logs' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = (formData.get('name') as string) || file.name;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const logId = uuidv4().slice(0, 8);
    const filename = `saved/${user.username}/${logId}.txt`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Store metadata
    const metaFilename = `saved/${user.username}/${logId}.meta.json`;
    const metadata = JSON.stringify({
      id: logId,
      name,
      createdAt: new Date().toISOString(),
      blobUrl: blob.url,
    });
    await put(metaFilename, metadata, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return NextResponse.json({ id: logId, name, url: blob.url });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { blobs } = await list({ prefix: `saved/${user.username}/` });
    const metaBlobs = blobs.filter(b => b.pathname.endsWith('.meta.json'));

    const logs = await Promise.all(
      metaBlobs.map(async (blob) => {
        try {
          const res = await fetch(blob.url);
          return await res.json();
        } catch (error) {
          console.error(`Failed to fetch metadata for ${blob.pathname}:`, error);
          return null;
        }
      })
    );

    return NextResponse.json({ logs: logs.filter(Boolean) });
  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json({ error: 'Failed to list logs' }, { status: 500 });
  }
}
