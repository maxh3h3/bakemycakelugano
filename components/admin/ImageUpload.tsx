'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import t from '@/lib/admin-translations-extended';
import { ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Изображение продукта' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Неверный тип файла. Разрешены только JPEG, PNG и WebP.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Файл слишком большой. Максимум 5MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
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

      onChange(result.url);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить изображение');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-charcoal-700">
        {label}
      </label>

      {!value ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`
              flex flex-col items-center justify-center w-full h-40 
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brown-500"></div>
                <p className="mt-2 text-sm text-charcoal-600">{t.uploading}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ImageIcon className="w-12 h-12 text-charcoal-400 mb-2" />
                <p className="text-sm text-charcoal-600 font-medium">
                  Нажмите для загрузки изображения
                </p>
                <p className="text-xs text-charcoal-500 mt-1">
                  PNG, JPG, WEBP до 5MB
                </p>
              </div>
            )}
          </label>
        </div>
      ) : (
        <div className="relative w-full h-40 border-2 border-cream-300 rounded-lg overflow-hidden bg-cream-50">
          <Image
            src={value}
            alt="Product image"
            fill
            className="object-contain p-2"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

