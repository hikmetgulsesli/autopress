import { ExternalLink, Camera } from 'lucide-react';
import type { ImageSearchResult } from '../types';

interface ImageAttributionProps {
  image: ImageSearchResult;
  className?: string;
}

export default function ImageAttribution({ image, className }: ImageAttributionProps) {
  const unsplashUrl = `https://unsplash.com/?utm_source=autopress&utm_medium=referral`;
  const photographerUrl = `${image.photographer.portfolioUrl}?utm_source=autopress&utm_medium=referral`;

  return (
    <div 
      className={`flex items-center gap-3 p-3 bg-surface-alt border border-border rounded-lg ${className || ''}`}
      style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={image.thumbUrl}
          alt={image.altDescription || image.description || 'Selected image'}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">
          {image.description || image.altDescription || 'Stock photo'}
        </p>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Camera className="w-3 h-3" />
          <span>Photo by</span>
          <a
            href={photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-500 transition-colors inline-flex items-center gap-0.5"
            style={{ color: 'var(--color-primary-400)' }}
          >
            {image.photographer.name}
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>on</span>
          <a
            href={unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-500 transition-colors inline-flex items-center gap-0.5"
            style={{ color: 'var(--color-primary-400)' }}
          >
            Unsplash
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-xs text-text-subtle mt-1">
          {image.width} × {image.height} px
        </p>
      </div>
    </div>
  );
}
