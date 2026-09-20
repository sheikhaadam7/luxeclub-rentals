import imageCompression from 'browser-image-compression'

export type CompressResult = {
  blob: Blob
  originalSize: number
  newSize: number
  filename: string
}

const HEIC_TYPES = new Set(['image/heic', 'image/heif'])
const HEIC_EXTS = /\.(heic|heif)$/i

async function convertHeicToJpeg(file: File): Promise<File> {
  const mod = await import('heic2any')
  const heic2any = mod.default
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const blob = Array.isArray(out) ? out[0] : out
  const jpegName = file.name.replace(HEIC_EXTS, '.jpg')
  return new File([blob], jpegName, { type: 'image/jpeg' })
}

export async function compressImage(file: File): Promise<CompressResult> {
  const originalSize = file.size
  let input: File = file

  if (HEIC_TYPES.has(file.type) || HEIC_EXTS.test(file.name)) {
    input = await convertHeicToJpeg(file)
  }

  const compressed = await imageCompression(input, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.85,
  })

  const baseName = input.name.replace(/\.[^.]+$/, '')
  return {
    blob: compressed,
    originalSize,
    newSize: compressed.size,
    filename: `${baseName}.webp`,
  }
}
