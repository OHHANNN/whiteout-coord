import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui 標配：合併 Tailwind class、後面覆蓋前面衝突 utility。
 *   cn("p-4 bg-red-500", isActive && "bg-blue-500")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
