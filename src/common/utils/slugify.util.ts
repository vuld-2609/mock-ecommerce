import baseSlugify from 'slugify';

export function slugify(text: string): string {
  return baseSlugify(text, { lower: true, strict: true, trim: true });
}
