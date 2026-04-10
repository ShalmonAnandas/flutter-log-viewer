import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const shareId = uuidv4().slice(0, 8);
    const filename = `logs/${shareId}.txt`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({
      shareId,
      url: blob.url,
      shareUrl: `/shared/${shareId}`,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to share log. Make sure BLOB_READ_WRITE_TOKEN is configured.' },
      { status: 500 }
    );
  }
}
