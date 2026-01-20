'use client';

import { useState, useRef, useId } from 'react';
import Image from 'next/image';
import t from '@/lib/admin-translations-extended';
import { ImageIcon, X } from 'lucide-react';

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

export default function MultiImageUpload({
  value,
  onChange,
  label = 'Изображения продукта',
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const validateFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Неверный тип файла. Разрешены только JPEG, PNG и WebP.';
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Файл слишком большой. Максимум 5MB.';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/product-image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Не удалось загрузить изображение');
    }

    return result.url as string;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        const url = await uploadFile(file);
        uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls]);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить изображение');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (url: string) => {
    onChange(value.filter((item) => item !== url));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-charcoal-700">
        {label}
      </label>

      <div className="grid grid-cols-2 gap-3">
        {value.map((url) => (
          <div
            key={url}
            className="relative w-full h-32 border-2 border-cream-300 rounded-lg overflow-hidden bg-cream-50"
          >
            <Image
              src={url}
              alt="Product image"
              fill
              className="object-contain p-2"
            />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isUploading}
            multiple
            className="hidden"
            id={inputId}
          />
          <label
            htmlFor={inputId}
            className={`
              flex flex-col items-center justify-center w-full h-32
              border-2 border-dashed rounded-lg cursor-pointer
              transition-colors
              ${
                isUploading
                  ? 'border-brown-300 bg-cream-100 cursor-wait'
                  : 'border-cream-300 bg-cream-50 hover:bg-cream-100 hover:border-brown-400'
              }
            `}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-500"></div>
                <p className="mt-2 text-xs text-charcoal-600">{t.uploading}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ImageIcon className="w-8 h-8 text-charcoal-400 mb-2" />
                <p className="text-xs text-charcoal-600 font-medium">
                  Нажмите, чтобы добавить
                </p>
                <p className="text-[11px] text-charcoal-500 mt-1">
                  PNG, JPG, WEBP до 5MB
                </p>
              </div>
            )}
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
