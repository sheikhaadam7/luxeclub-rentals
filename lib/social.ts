/**
 * LuxeClub Rentals social platforms — single source of truth.
 *
 * To add a new platform (e.g. TikTok, YouTube):
 *   1. Append an entry to SOCIAL_PLATFORMS below.
 *   2. Add its SVG case to components/ui/SocialIcon.tsx.
 * No other file needs to change — Footer, JSON-LD sameAs, and the
 * Contact page all iterate over this array.
 */

export interface SocialPlatform {
  /** Machine key used by SocialIcon to pick the right SVG. */
  key: string
  /** Human label ("Instagram", "Facebook"). */
  label: string
  /** Handle shown next to the icon (e.g. "@luxeclubrentals" or "/luxeclubrentals"). */
  handle: string
  /** Canonical profile URL (goes into href + JSON-LD sameAs). */
  url: string
  /** Screen-reader label for the link. */
  ariaLabel: string
}

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    handle: '@luxeclubrentals',
    url: 'https://www.instagram.com/luxeclubrentals/',
    ariaLabel: 'LuxeClub Rentals on Instagram',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    handle: '/luxeclubrentals',
    url: 'https://www.facebook.com/luxeclubrentals',
    ariaLabel: 'LuxeClub Rentals on Facebook',
  },
] as const

/** Every social URL, in order — plug into JSON-LD `sameAs`. */
export const socialSameAs = (): string[] => SOCIAL_PLATFORMS.map((p) => p.url)
