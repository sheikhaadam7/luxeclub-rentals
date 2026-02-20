import { config } from 'dotenv'
config({ path: '.env.local' })
import { chromium } from 'playwright'

async function discover() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://www.luxeclubrentals.com/garage', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(4000)

  // Find short text elements that could be brand filters
  const elements = await page.evaluate(() => {
    const results: string[] = []
    const all = document.querySelectorAll('*')
    for (const el of Array.from(all)) {
      const htmlEl = el as HTMLElement
      // Only leaf or near-leaf elements with short text
      if (htmlEl.children.length > 3) continue
      const text = htmlEl.textContent?.trim()
      if (!text || text.length < 2 || text.length > 40) continue
      if (text.includes('\n')) continue

      // Check if it looks like a brand name or filter
      const tag = htmlEl.tagName
      const cls = htmlEl.className?.toString().slice(0, 50) || ''
      const onclick = htmlEl.onclick ? 'has-onclick' : ''
      const cursor = getComputedStyle(htmlEl).cursor
      const role = htmlEl.getAttribute('role') || ''

      if (cursor === 'pointer' || role === 'button' || tag === 'BUTTON' || tag === 'A') {
        results.push(`"${text}" | ${tag} | cursor:${cursor} | role:${role}`)
      }
    }
    // Deduplicate
    return [...new Set(results)]
  })

  console.log('Clickable elements on /garage:')
  elements.forEach(e => console.log('  ' + e))

  // Also get all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => {
      const href = (a as HTMLAnchorElement).getAttribute('href') || ''
      const text = (a as HTMLAnchorElement).textContent?.trim().slice(0, 50) || ''
      return `${text} → ${href}`
    })
  })

  console.log('\nAll links:')
  links.forEach(l => console.log('  ' + l))

  await browser.close()
}

discover().catch(e => { console.error(e); process.exit(1) })
