import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: 'Sharing is not configured. Missing BLOB_READ_WRITE_TOKEN.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const shareId = uuidv4().slice(0, 8);
    const filename = `logs/${shareId}.txt`;

    // Pass token explicitly to avoid environment resolution issues across local/dev/prod runtimes.
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      token: blobToken,
      contentType: 'text/plain',
    });

    const encodedUrl = encodeURIComponent(blob.url);

    return NextResponse.json({
      shareId,
      url: blob.url,
      shareUrl: `/shared/${shareId}?u=${encodedUrl}`,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to share log. Make sure BLOB_READ_WRITE_TOKEN is configured.' },
      { status: 500 }
    );
  }
}
