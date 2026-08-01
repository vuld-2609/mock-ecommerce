export const FileableType = {
  USER: 'USER',
  PRODUCT: 'PRODUCT',
} as const;

export type FileableType = (typeof FileableType)[keyof typeof FileableType];
