export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toString()
    .normalize('NFD')                    // Split accented characters
    .replace(/[\u0300-\u036f]/g, '')     // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                // Replace spaces with -
    .replace(/[^\w\-]+/g, '')            // Remove all non-word chars
    .replace(/\-\-+/g, '-');             // Replace multiple - with single -
}

export function generateSlug(title: string): string {
  const base = slugify(title);
  // Add a short random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  return base ? `${base}-${suffix}` : `post-${suffix}`;
}

export default slugify;
