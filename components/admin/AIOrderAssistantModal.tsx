'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AIExtractedOrderData, AIOrderProcessingResponse } from '@/types/ai-order';

interface AIOrderAssistantModalProps {
  onClose: () => void;
  onOrderExtracted: (data: AIExtractedOrderData) => void;
}

type ProcessingStep = 'input' | 'processing' | 'error';

export default function AIOrderAssistantModal({ onClose, onOrderExtracted }: AIOrderAssistantModalProps) {
  const [step, setStep] = useState<ProcessingStep>('input');
  const [textInput, setTextInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    // Save original overflow style
    const originalOverflow = document.body.style.overflow;
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle file upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Convert files to base64
  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please upload image files only (PNG, JPG, JPEG)');
      return;
    }

    if (images.length + imageFiles.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    const newImages: string[] = [];
    for (const file of imageFiles) {
      const base64 = await fileToBase64(file);
      newImages.push(base64);
    }

    setImages(prev => [...prev, ...newImages]);
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);

      // Update recording time
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setStep('processing');
      
      // Create form data for Whisper API
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');

      // Note: We'll use OpenAI's Whisper API directly from the server
      // For now, we'll convert to text on the server side
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Call transcription endpoint (we'll create this next)
        const response = await fetch('/api/admin/orders/ai-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });

        const data = await response.json();
        if (data.success && data.text) {
          setTextInput(prev => prev + (prev ? '\n\n' : '') + data.text);
          setStep('input');
        } else {
          throw new Error(data.error || 'Transcription failed');
        }
      };
      reader.readAsDataURL(audioBlob);

    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please try typing instead.');
      setStep('input');
    }
  };

  // Process the order
  const handleProcess = async () => {
    if (!textInput.trim() && images.length === 0) {
      setError('Please provide either text, images, or voice input');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const response = await fetch('/api/admin/orders/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textInput.trim() || undefined,
          images: images.length > 0 ? images : undefined,
          context: {
            defaultCountry: 'Switzerland',
            currentDate: new Date().toISOString().split('T')[0],
          },
        }),
      });

      const data: AIOrderProcessingResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract order data');
      }

      // Automatically use the extracted data without review step
      if (data.data) {
        onOrderExtracted(data.data);
        onClose();
      }

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process order');
      setStep('error');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold">AI Order Assistant</h2>
              <p className="text-sm text-white/80">Upload screenshots or speak to create order instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Error display */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-5">
                <h3 className="font-heading font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How it works
                </h3>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">1.</span>
                    <span>Upload screenshots (WhatsApp, Instagram, messages) or type/speak the order details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">2.</span>
                    <span>AI extracts customer info, items, delivery details, and payment information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">3.</span>
                    <span>Review the extracted data and make any adjustments before creating the order</span>
                  </li>
                </ul>
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-3">
                  Upload Screenshots (Optional)
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-3 border-dashed border-purple-300 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all"
                >
                  <svg className="w-12 h-12 mx-auto text-purple-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-semibold text-charcoal-800 mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-charcoal-500">PNG, JPG up to 10MB (max 5 images)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Image previews */}
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-cream-300"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-cream-300"></div>
                <span className="text-sm font-semibold text-charcoal-500 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-cream-300"></div>
              </div>

              {/* Voice Recording */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-3">
                  Voice Input (Optional)
                </label>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
                  {!isRecording ? (
                    <div className="text-center">
                      <button
                        onClick={startRecording}
                        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center mx-auto mb-3 transition-all transform hover:scale-105 shadow-lg"
                      >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>
                      <p className="font-semibold text-charcoal-800 mb-1">Click to start recording</p>
                      <p className="text-sm text-charcoal-600">Speak the order details clearly</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="6" />
                        </svg>
                      </div>
                      <p className="font-bold text-red-600 text-xl mb-2">{formatTime(recordingTime)}</p>
                      <p className="text-sm text-charcoal-600 mb-4">Recording in progress...</p>
                      <button
                        onClick={stopRecording}
                        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                      >
                        Stop Recording
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-cream-300"></div>
                <span className="text-sm font-semibold text-charcoal-500 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-cream-300"></div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-3">
                  Type Order Details (Optional)
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste conversation or type order details here...&#10;&#10;Example:&#10;Customer: Maria Rossi&#10;Phone: +41 79 123 4567&#10;Order: Chocolate birthday cake, 2kg, writing &quot;Happy Birthday Sofia&quot;&#10;Delivery: Tomorrow at 3pm, pickup&#10;Payment: Twint, already paid"
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6"></div>
              <h3 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">Processing with AI...</h3>
              <p className="text-charcoal-600 text-center max-w-md">
                Analyzing your input and extracting order information. Data will automatically populate the order form.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">Processing Failed</h3>
              <p className="text-charcoal-600 text-center max-w-md mb-6">{error}</p>
              <button
                onClick={() => setStep('input')}
                className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-cream-50 border-t-2 border-cream-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300"
          >
            Cancel
          </button>

          {step === 'input' && (
            <button
              onClick={handleProcess}
              disabled={!textInput.trim() && images.length === 0}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                !textInput.trim() && images.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Process with AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
