export type Rect = { x: number; y: number; w: number; h: number }

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function initialCrop(width: number, height: number, r: number): Rect {
  let w = width,
    h = height
  if (r) {
    w = Math.min(width, height * r)
    h = w / r
  }
  return {
    x: Math.floor((width - w) / 2),
    y: Math.floor((height - h) / 2),
    w: Math.max(1, Math.floor(w)),
    h: Math.max(1, Math.floor(h)),
  }
}

export function updateCrop(
  current: Rect,
  key: keyof Rect,
  value: number,
  width: number,
  height: number,
  r: number,
): Rect {
  const rect = { ...current }
  if (!Number.isFinite(value)) return rect
  if (key === 'x' || key === 'y')
    rect[key] = clamp(Math.round(value), 0, key === 'x' ? width - rect.w : height - rect.h)
  else {
    const maxW = width - rect.x,
      maxH = height - rect.y
    if (r) {
      const w = clamp(key === 'w' ? value : value * r, 1, Math.min(maxW, maxH * r))
      rect.w = Math.max(1, Math.round(w))
      rect.h = Math.max(1, Math.min(maxH, Math.round(w / r)))
    } else rect[key] = clamp(Math.round(value), 1, key === 'w' ? maxW : maxH)
  }
  return rect
}

export function exportFilename(value: string, mime: string): string {
  const base =
    value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 100) || '裁剪图片'
  return `${/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base) ? '_' : ''}${base}.${mime === 'image/png' ? 'png' : 'jpg'}`
}
