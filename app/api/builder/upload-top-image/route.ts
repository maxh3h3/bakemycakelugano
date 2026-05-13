import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyBuilderToken } from '@/lib/builder-token';

/**
 * Uploads a custom image for the cake builder (top tier decoration).
 * Configure bucket `SUPABASE_BUILDER_BUCKET` (defaults to `order-items`) and
 * ensure the bucket is public or use signed URLs for the returned path.
 */
const BUCKET = process.env.SUPABASE_BUILDER_BUCKET || 'order-items';
const PREFIX = 'builder/top-images';

export async function POST(request: NextRequest) {
  if (!verifyBuilderToken(request.headers.get('x-builder-token'))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 },
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Maximum file size is 5MB.' },
        { status: 400 },
      );
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const fileName = `${PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('[builder/upload-top-image]', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Upload failed' },
        { status: 500 },
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      bucket: BUCKET,
    });
  } catch (e) {
    console.error('[builder/upload-top-image]', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
