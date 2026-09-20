import { expect, test } from 'vitest'
import { initialCrop, updateCrop, exportFilename } from '../src/crop'

test('centers the largest crop for free, square and widescreen ratios', () => {
  expect(initialCrop(800, 600, 0)).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  expect(initialCrop(800, 600, 1)).toEqual({ x: 100, y: 0, w: 600, h: 600 })
  expect(initialCrop(800, 600, 16 / 9)).toEqual({ x: 0, y: 75, w: 800, h: 450 })
  expect(initialCrop(600, 800, 1)).toEqual({ x: 0, y: 100, w: 600, h: 600 })
})

test('clamps positions and sizes to the image and rounds to whole pixels', () => {
  const crop = { x: 100, y: 50, w: 200, h: 200 }
  expect(updateCrop(crop, 'x', 99999, 800, 600, 0).x).toBe(600)
  expect(updateCrop(crop, 'y', -10, 800, 600, 0).y).toBe(0)
  expect(updateCrop(crop, 'x', 110.6, 800, 600, 0).x).toBe(111)
  expect(updateCrop(crop, 'w', 99999, 800, 600, 0).w).toBe(700)
  expect(updateCrop(crop, 'h', 99999, 800, 600, 0).h).toBe(550)
  expect(updateCrop(crop, 'w', -10, 800, 600, 0).w).toBe(1)
  expect(crop).toEqual({ x: 100, y: 50, w: 200, h: 200 })
})

test('keeps the selected ratio when either dimension changes', () => {
  const crop = { x: 100, y: 0, w: 600, h: 600 }
  expect(updateCrop(crop, 'w', 200, 800, 600, 1)).toEqual({ x: 100, y: 0, w: 200, h: 200 })
  expect(updateCrop(crop, 'h', 100, 800, 600, 2)).toEqual({ x: 100, y: 0, w: 200, h: 100 })
  expect(updateCrop(crop, 'w', 99999, 800, 600, 1)).toEqual(crop)
})

test.each([NaN, Infinity, -Infinity])('ignores non-finite input %s', (value) => {
  const crop = initialCrop(800, 600, 1)
  expect(updateCrop(crop, 'w', value, 800, 600, 1)).toEqual(crop)
})

test.each([
  ['测试图片-裁剪', 'image/png', '测试图片-裁剪.png'],
  ['photo', 'image/jpeg', 'photo.jpg'],
  ['bad/name?. ', 'image/png', 'bad_name_.png'],
  ['CON', 'image/png', '_CON.png'],
  ['lpt1.backup', 'image/jpeg', '_lpt1.backup.jpg'],
  ['... ', 'image/png', '裁剪图片.png'],
  ['x'.repeat(120), 'image/png', `${'x'.repeat(100)}.png`],
])('creates a safe export filename for %s', (value, mime, expected) => {
  expect(exportFilename(value, mime)).toBe(expected)
})
