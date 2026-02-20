import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Downloads vehicle images from their source URLs and uploads them to
 * Supabase Storage bucket 'vehicle-images'.
 *
 * Returns a Map<slug, publicUrl[]> with the storage public URLs for each vehicle.
 *
 * Uses global fetch() (Node.js built-in) — NOT affected by Playwright's page.route() blocking.
 */
export async function uploadImages(
  supabase: SupabaseClient,
  vehicles: Array<{ slug: string; image_urls: string[] }>,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()

  for (const vehicle of vehicles) {
    const publicUrls: string[] = []
    console.log(`  Uploading images for ${vehicle.slug} (${vehicle.image_urls.length} images)...`)

    for (let i = 0; i < vehicle.image_urls.length; i++) {
      const imageUrl = vehicle.image_urls[i]
      try {
        // Fetch the image bytes using Node's global fetch
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LuxeClubScraper/1.0)',
          },
        })

        if (!response.ok) {
          console.warn(`    SKIP: ${imageUrl} returned ${response.status}`)
          continue
        }

        // Determine file extension from content-type or URL
        const contentType = response.headers.get('content-type') ?? 'image/jpeg'
        const ext = contentTypeToExt(contentType, imageUrl)
        const storagePath = `${vehicle.slug}/${i}.${ext}`

        const imageBuffer = await response.arrayBuffer()

        // Upload to Supabase Storage (upsert=true so re-runs don't error)
        const { error } = await supabase.storage
          .from('vehicle-images')
          .upload(storagePath, imageBuffer, {
            contentType,
            upsert: true,
          })

        if (error) {
          console.warn(`    SKIP: Upload failed for ${storagePath}: ${error.message}`)
          continue
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('vehicle-images')
          .getPublicUrl(storagePath)

        publicUrls.push(urlData.publicUrl)
        console.log(`    Uploaded: ${storagePath}`)
      } catch (err) {
        console.warn(`    SKIP: Error processing ${imageUrl}: ${err}`)
      }
    }

    result.set(vehicle.slug, publicUrls)
    console.log(`  ${vehicle.slug}: ${publicUrls.length}/${vehicle.image_urls.length} images uploaded`)
  }

  return result
}

/**
 * Maps a content-type header to a file extension.
 * Falls back to extracting extension from URL if content-type is generic.
 */
function contentTypeToExt(contentType: string, fallbackUrl: string): string {
  const ct = contentType.split(';')[0].trim().toLowerCase()
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
  }
  if (map[ct]) return map[ct]

  // Try to extract from URL
  const urlExt = fallbackUrl.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(urlExt)) {
    return urlExt === 'jpeg' ? 'jpg' : urlExt
  }

  return 'jpg'
}
