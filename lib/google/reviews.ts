import 'server-only'

export interface GoogleReview {
  name: string
  text: string
  rating: number
  relativeTime: string
  profilePhoto?: string
}

const PLACE_ID = process.env.GOOGLE_PLACE_ID ?? ''
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

let cachedReviews: GoogleReview[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function getGoogleReviews(): Promise<GoogleReview[]> {
  if (!PLACE_ID || !API_KEY) return []

  // Return cached if fresh
  if (cachedReviews && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedReviews
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews&reviews_sort=newest&key=${API_KEY}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()

    if (data.status !== 'OK' || !data.result?.reviews) return []

    const reviews: GoogleReview[] = data.result.reviews
      .filter((r: any) => r.rating >= 4 && r.text?.trim())
      .map((r: any) => ({
        name: r.author_name ?? 'Anonymous',
        text: r.text,
        rating: r.rating,
        relativeTime: r.relative_time_description ?? '',
        profilePhoto: r.profile_photo_url ?? undefined,
      }))

    cachedReviews = reviews
    cacheTimestamp = Date.now()
    return reviews
  } catch {
    return []
  }
}
