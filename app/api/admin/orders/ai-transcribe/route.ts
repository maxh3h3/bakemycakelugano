import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { openai } from '@/lib/openai/client';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { audio } = body;

    if (!audio) {
      return NextResponse.json(
        { success: false, error: 'Audio data is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const base64Data = audio.includes('base64,') ? audio.split('base64,')[1] : audio;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Create a File-like object for the Whisper API
    const audioFile = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' });

    // Call OpenAI Whisper API
    console.log('Calling Whisper API for transcription...');
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be auto-detected or set to 'de', 'it', 'fr' for Swiss languages
      response_format: 'text',
    });

    console.log('Transcription successful');

    return NextResponse.json({
      success: true,
      text: transcription,
    });

  } catch (error) {
    console.error('Error in audio transcription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
