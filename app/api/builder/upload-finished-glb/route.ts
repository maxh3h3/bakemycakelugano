import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyBuilderToken } from '@/lib/builder-token';

/**
 * Uploads a finished cake GLB (e.g. export from your 3D pipeline) for archival / fulfilment.
 * Same bucket family as images; override with `SUPABASE_BUILDER_BUCKET`.
 */
const BUCKET = process.env.SUPABASE_BUILDER_BUCKET || 'order-items';
const PREFIX = 'builder/finished-cakes';

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

    if (!file.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json(
        { success: false, error: 'Only .glb files are allowed.' },
        { status: 400 },
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Maximum file size is 50MB.' },
        { status: 400 },
      );
    }

    const fileName = `${PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.glb`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(fileName, buffer, {
      contentType: 'model/gltf-binary',
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      console.error('[builder/upload-finished-glb]', error);
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
    console.error('[builder/upload-finished-glb]', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
