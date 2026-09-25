/**
 * Model-specific SEO content for priority vehicle detail pages.
 * Only the top ~10 vehicles by Search Console impressions get expanded
 * content — the rest render with the standard product layout only.
 */

export interface VehicleFaq {
  question: string
  answer: string
}

export interface VehicleContent {
  /** Override for the <title> tag — should include "rental Dubai" */
  metaTitle: string
  /** Short description paragraph below specs, above FAQ */
  description: string
  /** FAQ accordion items — also emitted as FAQPage JSON-LD */
  faqs: VehicleFaq[]
  /**
   * ISO date (YYYY-MM-DD) when this content was last hand-edited.
   * Feeds dateModified in Vehicle JSON-LD as a freshness signal.
   * Optional — when absent, page falls back to Supabase vehicles.updated_at.
   */
  updatedAt?: string
  /**
   * Editorial author for FAQPage JSON-LD (E-E-A-T signal).
   * Optional — page defaults to "LuxeClub Editorial" when absent.
   */
  author?: string
}

export const vehicleContentMap: Record<string, VehicleContent> = {
  'aston-martin-dbx-707': {
    metaTitle: 'Rent Aston Martin DBX 707 in Dubai — Hire from AED 2,500/day',
    description:
      "The Aston Martin DBX 707 is the most powerful luxury SUV Aston Martin has ever built — a 4.0-litre twin-turbo V8 producing 697bhp, 0-100 in 3.3 seconds, and a surprisingly driver-focused chassis for a 2.2-tonne SUV. It's one of the best-kept secrets in the Dubai luxury rental market: comparable performance to a Lamborghini Urus at a lower daily rate, with a cabin that most customers find more refined than any German competitor.\n\nAston Martin DBX 707 car rental in Dubai is AED 2,500 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote based on your exact dates. Every rental includes comprehensive insurance, delivery across Dubai (free on monthly rentals, a flat surcharge on shorter rentals), 24/7 WhatsApp support, and a full handover walkthrough of the driving modes and air suspension settings. The reservation fee is AED 495, deducted from your total on pickup day.\n\nThe DBX 707 is particularly popular with business travellers who want presence at valet without the attention of a G63, and with families visiting Dubai who need genuine rear-seat space and luggage capacity. It handles the Sheikh Zayed Road run to Abu Dhabi as well as anything in the fleet, and the air suspension makes Dubai's speed bumps and parking-entry ramps genuinely comfortable.",
    faqs: [
      {
        question: 'How much does it cost to rent an Aston Martin DBX 707 in Dubai?',
        answer: 'The Aston Martin DBX 707 rents for AED 2,500 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'What is the minimum age to rent a DBX 707?',
        answer: 'The minimum age is 25. Tourists also need a valid International Driving Permit (IDP) alongside their home-country driving licence.',
      },
      {
        question: 'Is the DBX 707 good for families?',
        answer: "Yes — the DBX 707 has genuine rear-seat space for adults, a large boot, and air suspension that makes the ride comfortable for all passengers. It's one of the best family-capable luxury SUVs in our fleet alongside the Bentley Bentayga and Cadillac Escalade.",
      },
      {
        question: 'Can I drive the DBX 707 to Abu Dhabi?',
        answer: 'Yes — our insurance covers the entire UAE. Abu Dhabi is 1.5 hours each way from Dubai Marina.',
      },
    ],
  },
  'bmw-m3-competition': {
    metaTitle: 'Rent BMW M3 Competition in Dubai — Hire from AED 899/day',
    description:
      "The BMW M3 Competition is the sharpest M-car in our fleet — a twin-turbo straight-six producing 503bhp, rear-wheel drive, 0-100 in 3.9 seconds, and the mid-corner precision that made M-cars the benchmark for performance saloons. At AED 899 per day it's also one of the best-value genuine performance car rentals in Dubai.\n\nBMW M3 Competition car rental in Dubai is AED 899 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Every rental includes comprehensive insurance, delivery across Dubai (free on monthly rentals, a flat surcharge on shorter rentals), 24/7 WhatsApp support, and a full handover walkthrough.\n\nThe M3 Competition is ideal for enthusiast drivers who want to experience proper rear-wheel-drive dynamics on relaxed Jebel Jais, Hatta, or Sheikh Zayed Road drives without the supercar price tag. It's the car we recommend for first-time M-division customers — approachable enough to daily drive, rewarding enough to justify a dedicated scenic-day-trip rental.",
    faqs: [
      {
        question: 'How much does it cost to rent a BMW M3 Competition in Dubai?',
        answer: 'The BMW M3 Competition rents for AED 899 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'Is the M3 Competition rear-wheel drive or all-wheel drive?',
        answer: 'Our M3 Competition is the rear-wheel-drive variant. This is the version most driving enthusiasts prefer because it offers a more engaging, adjustable driving experience — particularly on mountain roads like Jebel Jais where the rear-drive layout rewards throttle control.',
      },
      {
        question: 'Can I take the M3 Competition on Jebel Jais?',
        answer: "Yes — Jebel Jais is a memorable scenic destination for a day out in the M3. Smooth tarmac, panoramic viewpoints, and a summit restaurant make it one of the most photogenic drives in the country. Allow 3–4 hours round-trip from Dubai Marina. Please enjoy the drive at a relaxed pace within the posted speed limits.",
      },
      {
        question: 'What is the minimum age to rent a BMW M3 Competition?',
        answer: 'The minimum age is 25. Tourists also need a valid International Driving Permit alongside their home-country licence.',
      },
    ],
  },
  'audi-rs6': {
    metaTitle: 'Rent Audi RS6 Avant in Dubai — Hire from AED 1,200/day',
    description:
      "The Audi RS6 Avant is the estate car everyone secretly wants — a 4.0-litre twin-turbo V8 producing 591bhp, quattro all-wheel drive, 0-100 in 3.4 seconds, and the practical wagon body that makes it the perfect combination of supercar performance and family-car usability. It's the fastest estate car in our entire fleet.\n\nAudi RS6 car rental in Dubai is AED 1,200 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are all included.\n\nThe RS6 is the car of choice for relocated European professionals and visiting German customers who already own an RS6 at home and want the same car in Dubai. It seats five adults plus luggage comfortably, handles Sheikh Zayed Road at 120 km/h without using half its capability, and still turns heads at valet stops. For customers who want genuine 591bhp performance without sacrificing an ounce of practicality, the RS6 has no real competitor in the fleet.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi RS6 in Dubai?',
        answer: 'The Audi RS6 Avant rents for AED 1,200 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'Is the RS6 good for a family trip in Dubai?',
        answer: "Yes — the RS6 Avant is an estate car that seats five adults comfortably with genuine boot space for luggage. It's one of the best family-friendly performance cars in the fleet. The quattro all-wheel drive also provides excellent stability in any weather conditions.",
      },
      {
        question: 'Can I drive the RS6 to Abu Dhabi?',
        answer: 'Yes — our insurance covers the entire UAE. The RS6 is one of the best cars in the fleet for the Abu Dhabi run — the V8 is relaxed at highway speeds, the cabin is quiet, and the quattro system provides excellent stability.',
      },
      {
        question: 'Why is the RS6 so popular in Dubai?',
        answer: 'The RS6 combines 591bhp supercar-level performance with genuine five-seat estate-car practicality. Dubai has a large German expat community who know and trust the RS badge, and the RS6 at AED 1,200/day offers dramatically more car per dirham than anything in the supercar segment. It can replace your daily car AND serve as a performance machine.',
      },
    ],
  },
  'audi-rs3': {
    metaTitle: 'Rent Audi RS3 in Dubai — Hire from AED 699/day',
    description:
      "The Audi RS3 is the most affordable genuine performance car in our entire fleet — a 2.5-litre five-cylinder turbo producing 401bhp, quattro all-wheel drive, 0-100 in 3.8 seconds, and the distinctive five-cylinder engine note that has become an Audi RS signature. At AED 699 per day it's the entry point to proper performance car rental in Dubai.\n\nAudi RS3 car rental in Dubai is AED 699 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are included.\n\nThe RS3 is ideal for budget-conscious drivers who want genuine 400+bhp performance without the AED 2,000+ daily rates that supercars command. It's compact enough to park anywhere, easy to drive daily, and handles Hatta's mountain scenery as well as any larger RS model. The minimum age is 23 — lower than any other performance car in the fleet.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi RS3 in Dubai?',
        answer: "The Audi RS3 rents for AED 699 per day — the cheapest genuine performance car rental in our fleet. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are included.",
      },
      {
        question: 'What is the minimum age to rent an RS3?',
        answer: 'The minimum age is 23 — lower than most other performance cars in the fleet (which require 25). This makes the RS3 the most accessible performance rental for younger drivers visiting Dubai.',
      },
      {
        question: 'Is the RS3 fast enough to be exciting?',
        answer: "Yes — 401bhp, quattro all-wheel drive, and 0-100 in 3.8 seconds is faster than most sports cars. The five-cylinder engine produces a distinctive warble that's unique in the market, and the compact size makes it feel even quicker on tight roads like Hatta. Don't let the price fool you — this is a properly fast car.",
      },
      {
        question: 'Can I take the RS3 on Jebel Jais or Hatta?',
        answer: "Yes — both are allowed under our rental terms. The RS3's compact size and quattro grip make it particularly enjoyable on Hatta's tight mountain roads.",
      },
    ],
  },
  'lamborghini-revuelto': {
    metaTitle: 'Rent Lamborghini Revuelto in Dubai — Hire from AED 8,999/day',
    description:
      "The Lamborghini Revuelto is the flagship of the entire Dubai luxury rental market — a plug-in hybrid V12 hypercar producing 1,001bhp, 0-100 in 2.5 seconds, and a top speed over 350 km/h. It's one of maybe a dozen Revueltos available for rent anywhere in the world, and it is the single most requested car in our fleet.\n\nLamborghini Revuelto car rental in Dubai is AED 8,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Every rental includes comprehensive insurance, delivery across Dubai (free on monthly rentals, a flat surcharge on shorter rentals), 24/7 support, and an extended handover walkthrough covering the hybrid V12 drivetrain, the three electric motors, and the regeneration modes.\n\nThe Revuelto is the car for customers who want the absolute pinnacle of what's available in the Dubai market. It's the most theatrical car you can rent — and the hybrid V12 sounds different from any Lamborghini that came before it. We recommend booking at least two weeks in advance for specific dates, particularly on weekends and during peak season (November to March).",
    faqs: [
      {
        question: 'How much does it cost to rent a Lamborghini Revuelto in Dubai?',
        answer: 'The Lamborghini Revuelto rents for AED 8,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'What is the minimum age to rent a Revuelto?',
        answer: 'The minimum age is 27. The Revuelto is a 1,001bhp hypercar and the higher age threshold reflects the insurance requirements for a car of this value and performance level. Tourists need a valid International Driving Permit.',
      },
      {
        question: 'How far in advance should I book the Revuelto?',
        answer: 'We recommend at least two weeks in advance, and 4+ weeks during peak season (November to March). The Revuelto is the single most-requested car in our fleet and we frequently turn down bookings for popular weekends.',
      },
      {
        question: 'Can I drive the Revuelto to Jebel Jais?',
        answer: "Yes — Jebel Jais is allowed under our rental terms. However, the Revuelto is a very low, very wide hypercar and is better suited to highway driving and gentle mountain roads than tight switchbacks. If you specifically want the Jebel Jais switchback experience, the Huracán STO is the better Lamborghini choice. The Revuelto's V12 is best appreciated on the Sheikh Zayed Road run to Abu Dhabi where you can use its straight-line power.",
      },
    ],
  },
  'porsche-911-gt3-rs': {
    metaTitle: 'Rent Porsche 911 GT3 RS in Dubai — Hire from AED 1,999/day',
    description:
      "The Porsche 911 GT3 RS is the most extreme road-legal 911 ever built — a 518bhp naturally-aspirated flat-six that revs to 9,000 rpm, active DRS-style rear wing, race-derived suspension, and the most distinctive aero ever fitted to a 911. It is, by any objective measure, one of the best driver's cars in the world.\n\nPorsche 911 GT3 RS car rental in Dubai is AED 1,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are included. The handover walkthrough covers the active aero system, the DRS rear wing, the chassis settings, and the launch control.\n\nThe GT3 RS is the car for experienced drivers who appreciate Porsche's most focused engineering. It is not a comfortable cruiser — the ride is firm, the cabin is loud, and the car demands your attention. In return it delivers a driving feel that nothing else in the fleet can match. Take it to Jebel Jais at sunrise for the views and photos.",
    faqs: [
      {
        question: 'How much does it cost to rent a Porsche 911 GT3 RS in Dubai?',
        answer: 'The Porsche 911 GT3 RS rents for AED 1,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'Is the GT3 RS comfortable for daily driving?',
        answer: "Honestly, no — the GT3 RS is a track-focused car with a firm ride, loud cabin, and demanding driving character. It's extraordinary on mountain roads and highway blasts but not the right choice for a week of comfortable daily driving. If you want the 911 experience with daily comfort, the 911 Turbo S or 911 Carrera S Cabriolet are better choices. The GT3 RS is for enthusiasts who want a specific, intense driving experience.",
      },
      {
        question: 'Can I take the GT3 RS on Jebel Jais?',
        answer: "Yes — Jebel Jais is a beautiful scenic destination for a day out in the GT3 RS. Smooth tarmac, panoramic viewpoints, and a summit restaurant at 1,700 m for lunch or coffee. Get there at sunrise for the best light and the quietest roads. Allow 3–4 hours round-trip. The scenery and the photos are the point — drive at a relaxed pace within the posted limits.",
      },
      {
        question: 'What does the DRS rear wing do?',
        answer: "The GT3 RS's rear wing has an active DRS (drag reduction system) mode — similar to what Formula 1 cars use. On straights the wing flattens to reduce drag, and in corners it extends to maximum angle for downforce. The system is automatic but can be overridden in the drive modes. We'll demonstrate all of this during the handover walkthrough at pickup.",
      },
    ],
  },
  'ferrari-sf90-stradale': {
    metaTitle: 'Rent Ferrari SF90 in Dubai — Hire from AED 3,999/day',
    description:
      "The Ferrari SF90 Stradale is the fastest production Ferrari ever built — a plug-in hybrid V8 producing 986bhp combined from a twin-turbo V8 and three electric motors, 0-100 in 2.5 seconds, and the most technologically advanced car in the Ferrari lineup. It bridges the gap between supercar and hypercar.\n\nFerrari SF90 Stradale car rental in Dubai is AED 3,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are included. The handover walkthrough covers the hybrid drivetrain modes (eDrive for electric-only, Hybrid for combined, Performance and Qualify for maximum power).\n\nThe SF90 is for customers who want Ferrari's absolute best — the technology, the badge presence, and the most advanced car in the Prancing Horse stable. At AED 3,999/day it sits between the mainstream Ferrari range and the Lamborghini Revuelto, making it the value choice for customers who want near-hypercar presence without the AED 8,999/day Revuelto price.",
    faqs: [
      {
        question: 'How much does it cost to rent a Ferrari SF90 Stradale in Dubai?',
        answer: 'The Ferrari SF90 Stradale rents for AED 3,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'Can the SF90 drive in electric-only mode?',
        answer: "Yes — the SF90 has an eDrive mode that runs on electric motors only for up to 25 km. It's surprisingly smooth and quiet in this mode, and useful for early-morning hotel departures or parking garages. The hybrid mode blends both power sources automatically for the best balance of performance and efficiency.",
      },
      {
        question: 'What is the minimum age to rent the SF90?',
        answer: 'The minimum age is 27 for the SF90 Stradale. Tourists also need a valid International Driving Permit alongside their home-country licence.',
      },
      {
        question: 'How does the SF90 compare to the Lamborghini Revuelto?',
        answer: 'Both are hybrid hypercars but they feel very different. The SF90 has a V8 + three electric motors (986bhp) while the Revuelto has a V12 + three electric motors (1,001bhp). The SF90 feels more surgical and technology-led; the Revuelto is more theatrical. The SF90 at AED 3,999/day is meaningfully cheaper than the Revuelto at AED 8,999/day, making it the value hypercar choice.',
      },
    ],
  },
  'rolls-royce-culli-mansory': {
    metaTitle: 'Rent Cullinan Mansory Dubai — From AED 2,499/day',
    description:
      "The Rolls-Royce Cullinan Mansory is the most presence-heavy car in our entire fleet — a 6.75-litre twin-turbo V12 wrapped in a Mansory carbon-fibre aero kit, finished inside with lambswool rugs, a starlight headliner, and a rear cabin that rivals the best first-class airline seats. It doesn't just arrive — it changes the atmosphere of wherever you pull up.\n\nRolls-Royce Cullinan Mansory car rental in Dubai is AED 2,499 per day. Weekly and monthly rentals — and bespoke wedding/event packages — are priced case by case. Message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, white-glove delivery, and 24/7 support are included. Chauffeur service is available as an add-on, particularly popular for wedding bookings and business events.\n\nThe Cullinan Mansory is the car for occasions where the arrival matters as much as the destination — weddings, business signings, family visits where you want something exceptional, and any event where you want the most impressive car available in the Dubai rental market. We recommend booking at least two weeks in advance during peak season (November to March).",
    faqs: [
      {
        question: 'How much does it cost to rent a Rolls-Royce Cullinan Mansory in Dubai?',
        answer: 'The Cullinan Mansory rents for AED 2,499 per day. Weekly, monthly, and bespoke wedding/event packages are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance, white-glove delivery, and 24/7 support. Chauffeur service is available as an add-on.',
      },
      {
        question: 'Can I book the Cullinan for a wedding?',
        answer: "Yes — wedding bookings are one of the most common use cases. We can provide white-glove delivery to the ceremony venue, a suited chauffeur, and basic floral arrangements. Contact us on WhatsApp with your date and venue and we'll build a full quote.",
      },
      {
        question: 'What is the minimum age to rent the Cullinan Mansory?',
        answer: 'The minimum age is 30 — higher than most of our fleet given the value of the car and the specialised driving experience it rewards.',
      },
      {
        question: 'What makes the Mansory version different from a standard Cullinan?',
        answer: "The Mansory version has a full carbon-fibre aero kit (front splitter, side skirts, rear diffuser, roof spoiler), custom exhaust, wider wheels, and interior upgrades including the starlight headliner and bespoke trim. Visually it's dramatically more aggressive than a standard Cullinan, which is why it stands out in wedding photography and at Dubai hotel valets where standard Cullinans are relatively common.",
      },
    ],
  },
  'range-rover-vogue-hse': {
    metaTitle: 'Rent Range Rover Vogue HSE in Dubai — Hire from AED 899/day',
    description:
      "The Range Rover Vogue HSE is the definitive luxury SUV for Dubai — a comfortable long-distance cruiser with exceptional ride quality, genuine off-road capability, and enough rear legroom to work as a business saloon replacement. It's the car Dubai residents choose for their own daily driving, which tells you everything about how well it suits the city.\n\nRange Rover Vogue HSE car rental in Dubai is AED 899 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are included.\n\nThe Vogue HSE is the most popular family SUV in our fleet. It handles airport pickups, school runs, Hatta day trips, and DIFC business dinners without compromising on any of them. The air suspension flattens Dubai's speed bumps and the cabin is quiet enough for rear passengers to sleep on the Abu Dhabi run.",
    faqs: [
      {
        question: 'How much does it cost to rent a Range Rover Vogue HSE in Dubai?',
        answer: 'The Range Rover Vogue HSE rents for AED 899 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'Is the Vogue HSE good for families?',
        answer: "Yes — the Vogue HSE is one of the best family SUVs in our fleet. Five-seat layout with genuine rear legroom for adults, a large boot, and a ride quality that keeps children comfortable on longer drives. Popular for family visits, airport pickups, and week-long Dubai holidays.",
      },
      {
        question: 'Can I take the Range Rover off-road?',
        answer: 'Light off-road use (gravel shoulders, paved mountain roads, desert edges) is fine. Serious off-road use like deep-desert dune bashing is not covered by insurance. The Vogue HSE handles Hatta, Al Ain, and gravel-shoulder viewpoints without any issues.',
      },
      {
        question: "What's the difference between the Vogue HSE and the Mansory?",
        answer: 'Both are built on the same full-size Range Rover platform. The HSE is the classic, elegant version at AED 1,800/day. The Mansory has a carbon-fibre aero kit and more aggressive styling at AED 2,500/day. Pick the HSE for understated luxury, the Mansory for visual impact.',
      },
    ],
  },
  'audi-rsq8': {
    metaTitle: 'Rent Audi RSQ8 in Dubai — Hire from AED 899/day',
    updatedAt: '2026-09-25',
    author: 'LuxeClub Editorial',
    description:
      "The Audi RSQ8 is a five-seat performance SUV built around Audi's 4.0-litre twin-turbo V8, producing 591bhp with quattro all-wheel drive and adaptive air suspension. It covers 0-100 km/h in 3.8 seconds, tops out at 305 km/h, and does it all with a cabin quiet enough for a business call at motorway speed. Priced from AED 899 per day, the RSQ8 is our first choice when someone wants Urus-level performance without either the theatre or the price tag — the two cars share a chassis, but the RSQ8 keeps its show reserved for the tarmac. Available for rent in Dubai with delivery to your address, hotel, or DXB airport within Dubai limits. Deposit is AED 2,500. The first 250 km per day are included; the current daily rate is shown at the top of this page.\n\nThe RSQ8 does two things exceptionally well. The first is delivering pace that feels genuinely unusual for a 2.3-tonne SUV: throttle response from the twin-turbo V8 is immediate, the eight-speed transmission stays a beat ahead of what you're asking of it, and the four-wheel steering rotates the car through a corner with a lightness that reminds you Audi's RS division has been doing this for a long time. Get on it out of a slow corner on Sheikh Zayed Road and it moves in a way most sports saloons can't match — surprising even people who've driven the mechanically related Lamborghini Urus.\n\nThe second is that it isolates you completely from what it's doing. Air suspension in Comfort mode makes Dubai's speed bumps and parking-entry ramps genuinely comfortable. Active noise cancellation keeps the V8 out of the cabin unless you want to hear it. A panoramic roof, quilted Valcona leather, three-zone climate, and rear seats with real legroom for tall adults mean four people arriving in the RSQ8 will step out feeling less tired than they'd feel out of a Range Rover Sport SVR. Drive modes — Comfort, Auto, Dynamic, RS1, RS2, Efficiency — make the character selectable; RS1 and RS2 are user-programmable, and most of our regulars leave Comfort as the default and toggle to Dynamic when they get onto the E11 toward Abu Dhabi. Colour on this car is grey.\n\nThe RSQ8 rents most often to two customer types. The first is a resident driver who wants an occasional weekend break from a Range Rover — Downtown couples heading out to Al Qudra or Hatta for the day, or Business Bay families wanting something more entertaining than their daily. The second is a visiting business traveller landing at DXB who wants presence at valet without the attention a G63 draws in Downtown or DIFC. Both groups tend to book for three to seven days. Standard Dubai destinations handle it easily: airport-to-Marina, Marina-to-Palm, out to Address Sky View or FIVE Jumeirah Village for the weekend, or the drive east to Jebel Jais on a cool morning. The air suspension raises 30 mm at low speed for parking-entry ramps, which matters more in Dubai than most cities. Minimum age to rent is 24, one of the more accessible in our high-performance line-up. Book two to three days ahead in season for weekend dates. Delivery is AED 110 anywhere within Dubai. WhatsApp us on +971 58 808 6137 for weekly and monthly rates that fit your dates.\n\nTwo comparisons are worth thinking about before you book. Against the Lamborghini Urus, the RSQ8 offers most of the same on-road pace and the same underlying VW Group platform, and sits in a meaningfully lower price tier — the value pick when the badge isn't the point. Against the Bentley Bentayga, the RSQ8 is quicker, sharper, and firmer; the Bentayga is quieter, more spacious in the second row, and better suited to chauffeur use, at a broadly comparable daily rate. If comparison-shopping is where you're at, our Lamborghini Urus vs Audi RSQ8 guide at /guides/lamborghini-urus-vs-audi-rsq8-dubai goes deeper.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi RSQ8 in Dubai?',
        answer: 'The current daily rate is shown at the top of this page. For weekly and monthly quotes, WhatsApp us on +971 58 808 6137 — we tailor pricing to your dates and duration. Every rental includes comprehensive insurance and Salik/Darb toll integration. Delivery is AED 110 anywhere within Dubai.',
      },
      {
        question: 'What is the minimum age to rent the RSQ8?',
        answer: 'The minimum age is 24 — younger than most of our high-performance rentals. Tourists need a valid International Driving Permit alongside their home-country licence; UAE residents just need their Emirates driving licence.',
      },
      {
        question: 'Can I drive the RSQ8 to Jebel Jais or Abu Dhabi?',
        answer: 'Yes. Our insurance covers the entire UAE. Jebel Jais is a three-hour round trip from Dubai Marina and one of the country\'s most enjoyable drives; Abu Dhabi and Al Ain are also fine. Cars cannot leave the UAE, so no drives into Oman or Saudi Arabia.',
      },
      {
        question: 'How does the RSQ8 compare to the Lamborghini Urus?',
        answer: 'The RSQ8 shares its platform and V8 with the Urus. On paper the Urus makes more power (641 vs 591 bhp); on real Dubai roads the two feel closer than the numbers suggest. Where they diverge is the daily rate — the RSQ8 sits in a meaningfully lower price tier, which makes it the smart pick when you want the driving experience without paying for the Lamborghini badge. If you specifically want the badge or the more theatrical exhaust note, the Urus is the pick.',
      },
      {
        question: 'Is the RSQ8 good for a family trip?',
        answer: "Yes. Five adults fit comfortably with real rear legroom for tall passengers, the boot swallows airport luggage for four, and the air suspension keeps the ride relaxed even on Dubai's rougher connector roads. It's noticeably more entertaining to drive than a Range Rover Sport or Bentley Bentayga, without giving up much day-to-day usability.",
      },
      {
        question: 'How far ahead should I book the RSQ8?',
        answer: 'For weekday rentals, same-day or next-day is usually fine. For Thursday-to-Saturday windows in high season (November to March), book two to three days ahead — the RSQ8 is one of our more popular repeats and weekend availability tightens up.',
      },
    ],
  },
  'ferrari-purosangue': {
    metaTitle: 'Rent Ferrari Purosangue in Dubai — Hire from AED 8,999/day',
    description:
      "The Ferrari Purosangue is Ferrari's first four-door, four-seat car — and arguably the most controversial vehicle in the company's history. A naturally-aspirated 6.5-litre V12 producing 715bhp, 0-100 in 3.3 seconds, rear suicide doors, and a chassis that somehow feels like a Ferrari despite weighing over 2 tonnes. It is the only car in our fleet where a family of four can travel together in a genuine Ferrari.\n\nFerrari Purosangue car rental in Dubai is AED 8,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. Insurance, delivery, and 24/7 support are included.\n\nThe Purosangue is for customers who want the Ferrari experience — the V12 soundtrack, the chassis feel, the badge — but need four doors and four seats. It's popular with families, business delegations, and anyone who wants to prove that Ferrari's first SUV was worth the controversy. The naturally-aspirated V12 is the same engine family that powered the 812 Superfast, and it sounds extraordinary even at city speeds.",
    faqs: [
      {
        question: 'How much does it cost to rent a Ferrari Purosangue in Dubai?',
        answer: 'The Ferrari Purosangue rents for AED 8,999 per day. Weekly and monthly rentals are priced case by case — message us on WhatsApp (+971 58 808 6137) for a personalised quote. All rates include comprehensive insurance and 24/7 support. Delivery across Dubai is free on monthly rentals; daily and weekly rentals carry a flat AED 110 delivery + AED 110 pickup surcharge.',
      },
      {
        question: 'Can the Purosangue seat a family of four?',
        answer: "Yes — the Purosangue has four genuine adult-sized seats and rear suicide doors that make entry and exit easy. It's the only Ferrari in our fleet where a family of four can travel together comfortably. The boot is usable for luggage though not as large as a dedicated SUV.",
      },
      {
        question: 'What is the minimum age to rent the Purosangue?',
        answer: 'The minimum age is 27 for the Purosangue. Tourists also need a valid International Driving Permit.',
      },
      {
        question: 'Is the Purosangue a real SUV?',
        answer: "Ferrari insists the Purosangue is not an SUV — they call it a four-door sports car. In practice, it has the ride height, ground clearance, and four-wheel-drive capability of an SUV, combined with the chassis dynamics and V12 engine of a Ferrari sports car. It's higher and more spacious than a GTC4Lusso but not as tall as a Urus or Bentayga. Think of it as a sports car that happens to have four doors and a higher seating position.",
      },
    ],
  },
  'audi-a3': {
    metaTitle: 'Rent Audi A3 in Dubai — Hire from AED 249/day',
    updatedAt: '2026-09-25',
    author: 'LuxeClub Editorial',
    description:
      "The Audi A3 is a compact luxury saloon — five seats, front-wheel drive, automatic transmission — priced from AED 249 per day, making it the most accessible car in our fleet by some margin. It's the car we recommend when someone wants a rental that arrives at a Business Bay hotel or the DIFC valet without looking like a rental, and without spending supercar money to get there. The A3 keeps the important Audi things — cabin quality, ergonomics, ride refinement — in a package that's easy to live with day-to-day in Dubai traffic. Available for rent with delivery anywhere within Dubai. Deposit is AED 1,500. The first 250 km per day are included; the current daily rate is shown at the top of this page.\n\nThe A3 is Audi's compact luxury saloon and the entry point to the range. It shares a platform with the VW Golf and the SEAT Leon, but the platform-mates are only distantly related once you're inside: this is a proper Audi cabin with virtual cockpit instrumentation, MMI touchscreen infotainment, and the material quality that separates the brand from the mainstream compact segment. Around town it does everything you want a compact saloon to do — reasonable rear-seat space for two adults, a boot that swallows two carry-ons plus a garment bag, and the visibility that makes Dubai's tighter multi-storeys straightforward. On the motorway, the ride settles into a quiet cruise; wind noise is well suppressed for the class, and the automatic swaps ratios without fanfare when you need to overtake.\n\nIt's not a car that dominates a valet line — nobody's going to point at an A3, which is either exactly what you want (understated business trip, meeting-hopping around DIFC, unfussy weekly rental while your own car is in for service) or exactly what you don't (making an entrance). If it's the former, the A3 does the job better than anything else at this price point in Dubai. Standard equipment includes climate control, Apple CarPlay/Android Auto, LED lighting, cruise control, and parking sensors. Colour and trim details vary by allocation — see the specifications and images at the top of this page for the exact car you'll receive.\n\nThe A3 rents most often as \"the meeting car\" — a business visitor who lands at DXB and needs a car for four days of Downtown and DIFC meetings without paying a supercar day rate. It's also the fleet's go-to for anyone whose own car is in for service and wants something premium as a stand-in for a week, and increasingly for younger visiting drivers (age 21 minimum, the lowest in the fleet alongside the Q3) who want an actual Audi as their first Dubai rental rather than a mainstream economy car. Standard Dubai runs are all in scope: Marina to Downtown, hotel-to-airport transfers, day trips to Al Qudra or the beach at Palm Jumeirah. Book same-day for weekday rentals; weekends in high season (November to March) fill up faster because the A3 is one of the most-requested weekly rentals. Delivery is AED 110 anywhere within Dubai. WhatsApp us on +971 58 808 6137 for weekly and monthly rates that fit your dates.\n\nWithin our fleet, the A3's closest match is the Audi Q3 S Line at the same daily rate — same brand, same entry-premium positioning, same younger-driver accessibility. The Q3 gives you extra ground clearance, Quattro all-wheel drive, and an SUV silhouette for the same money; the A3 gives you a sportier saloon proportion, tighter city footprint, and marginally better fuel range on longer runs. If you're mostly city-driving and value the sleeker look, the A3 is the pick. If you're heading out to Hatta or Jebel Jais, or want the higher seating position for family passengers, the Q3 is the better call.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi A3 in Dubai?',
        answer: 'The current daily rate is shown at the top of this page. For weekly and monthly quotes, WhatsApp us on +971 58 808 6137 — we tailor pricing to your dates and duration. Every rental includes comprehensive insurance and Salik/Darb toll integration. Delivery is AED 110 anywhere within Dubai.',
      },
      {
        question: 'What is the minimum age to rent the Audi A3?',
        answer: 'The minimum age is 21, which makes the A3 one of the more accessible cars in our fleet. Tourists need a valid International Driving Permit alongside their home-country licence; UAE residents just need their Emirates driving licence.',
      },
      {
        question: 'Can I take the A3 on a day trip to Hatta, Al Qudra, or Abu Dhabi?',
        answer: "Yes — the A3 handles the paved routes out to Hatta, Al Qudra, and Abu Dhabi comfortably. It's front-wheel drive, not four-wheel drive, so for the Jebel Jais summit drive specifically we'd point customers toward the Q3 or RSQ8; the A3 is happy with everything else.",
      },
      {
        question: 'How does the A3 compare to the Q3 S Line?',
        answer: "Same brand, same daily rate, same entry-premium positioning. The A3 is a compact saloon — sleeker profile, tighter city footprint, marginally more efficient on longer runs. The Q3 is an SUV with Quattro all-wheel drive — higher seating, better for family passengers, better suited to Hatta and Jebel Jais day trips. If you're mostly city-driving in Downtown or DIFC, pick the A3. If you're heading out of the city or carrying two adults plus luggage, pick the Q3.",
      },
      {
        question: 'Is the A3 a good business-visitor rental?',
        answer: "Yes — it's one of the most requested cars for four-to-seven-day corporate visits. It arrives at DIFC and Downtown valet looking right without commanding attention, the automatic makes it easy to hand between drivers in a group, and at this daily rate it's easy to justify against the alternative of taxis or ride-hailing across multiple meetings per day.",
      },
      {
        question: 'How far ahead should I book the A3?',
        answer: 'For weekday rentals, same-day or next-day is usually fine. For Thursday-to-Saturday windows in high season (November to March), book two to three days ahead — the A3 is a repeat-customer favourite and weekend availability tightens up.',
      },
    ],
  },
  'audi-q3': {
    metaTitle: 'Rent Audi Q3 S Line in Dubai — Hire from AED 249/day',
    updatedAt: '2026-09-25',
    author: 'LuxeClub Editorial',
    description:
      "The Audi Q3 S Line is a 2025 compact luxury SUV — 228bhp turbocharged petrol, Quattro all-wheel drive, seven-speed S tronic — priced from AED 249 per day, making it one of the most accessible premium SUVs in Dubai. It's a car we hand equally to tourists who want a Q3 for four days of Downtown and Marina exploring, business visitors who need a car that looks right at DIFC, residents whose own car is off the road, and younger drivers (age 21 minimum) who can't yet rent a Lamborghini but don't want a mainstream compact for a week in the city. Available for rent with delivery anywhere within Dubai. Deposit is AED 1,500. The first 250 km per day are included; the current daily rate is shown at the top of this page.\n\nThis particular Q3 is the 2025 model, less than a year old, finished in white. What makes it worth choosing over the base 30 TFSI trim is the combination of things you notice from the driver's seat. The 2.0-litre turbocharged petrol engine (228bhp) has genuine mid-range shove — this is not a sluggish small SUV. The Quattro all-wheel drive is real, not the front-biased hybrid systems fitted to some entry-level premium SUVs; it makes a difference on the unpaved sections of the Hatta and Jebel Jais routes if you head out of the city, and on the rare heavier rain that Dubai gets between November and February.\n\nInside, the S Line trim gets the tighter seat bolstering, the flat-bottom steering wheel, the aluminium interior accents, and — the detail every customer mentions on collection — the full panoramic sunroof that opens across the whole cabin, not the smaller front-only unit fitted to lower-trim Q3s. In a city where the skyline does a lot of the visual work, the panoramic roof genuinely changes the driving experience. Standard equipment on this car includes the 360-degree camera (which makes valet returns and tight multi-storey parking straightforward), adaptive cruise control, wireless Apple CarPlay/Android Auto, and MMI navigation with the virtual cockpit instrumentation. Drive Select modes are Comfort, Auto, Dynamic, and Efficiency; Comfort is the sensible default in Dubai traffic.\n\nThe Q3 rents to the widest range of customers of any car in our fleet. Tourists who want premium without stepping up to supercar prices; business visitors who need a car that arrives at a meeting looking right; residents whose own car is in for service; younger visiting drivers (age 21 minimum, the lowest in the fleet alongside the A3) who want an actual Audi as their first Dubai rental rather than a mainstream economy car. Standard Dubai destinations are all comfortably in scope: Marina to Downtown, DXB airport transfers, weekend runs out to Address Sky View or FIVE Jumeirah Village. The Quattro plus the higher ground clearance make it the more sensible pick over the A3 for a day trip to Hatta or Jebel Jais — the drive up to the summit restaurant at Jais handles easily. Book same-day for weekday rentals in most weeks; weekends in high season (November to March) fill up faster because the Q3 is one of our most-requested weekly rentals. Delivery is AED 110 anywhere within Dubai. WhatsApp us on +971 58 808 6137 for weekly and monthly rates that fit your dates.\n\nWithin the fleet, the Q3's closest match is the A3 saloon at the same daily rate. The A3 is a sleeker city car with a tighter footprint and marginally better efficiency on longer runs; the Q3 gives you SUV ground clearance, Quattro all-wheel drive, a higher seating position, and a boot that swallows more airport luggage. If you're mostly city-driving, pick the A3. If you're heading out to Hatta or Jebel Jais, or want the higher seat for family passengers, the Q3 is the better call. For anyone stepping up from the Q3 who wants proper performance, the RSQ8 is the natural next tier.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi Q3 S Line in Dubai?',
        answer: 'The current daily rate is shown at the top of this page. For weekly and monthly quotes, WhatsApp us on +971 58 808 6137 — we tailor pricing to your dates and duration. Every rental includes comprehensive insurance and Salik/Darb toll integration. Delivery is AED 110 anywhere within Dubai.',
      },
      {
        question: 'What is the minimum age to rent the Q3?',
        answer: 'The minimum age is 21, which makes the Q3 one of the more accessible cars in our fleet alongside the A3. Tourists need a valid International Driving Permit alongside their home-country licence; UAE residents just need their Emirates driving licence.',
      },
      {
        question: 'Can I take the Q3 to Hatta or Jebel Jais?',
        answer: "Yes — the Q3's Quattro all-wheel drive and ground clearance are both well suited to the paved mountain routes out to Hatta and Jebel Jais. We do ask that you avoid unmade off-road tracks, but the standard tarmac routes to the summit restaurants are exactly what this car handles best.",
      },
      {
        question: 'How does the Q3 S Line compare to the A3?',
        answer: "Same brand, same daily rate, same entry-premium positioning — different body. The Q3 is an SUV with Quattro all-wheel drive: higher seating, better for family passengers, better for day trips out to Hatta or Jebel Jais. The A3 is a compact saloon: sleeker profile, tighter city footprint, marginally more efficient on long motorway runs. If you're mostly in Downtown and DIFC and want the more agile choice, pick the A3. If you're heading out of the city or want the higher seat, pick the Q3.",
      },
      {
        question: 'Is the Q3 a good choice for first-time visitors to Dubai?',
        answer: "Yes. It's one of the easier cars in our fleet to drive in Dubai conditions — compact enough for the older parts of the city, large enough to feel substantial on Sheikh Zayed Road, and the all-wheel drive removes any concern in heavier weather. The 360-degree camera makes valet returns and tight parking straightforward.",
      },
      {
        question: 'Does the Q3 have a sunroof?',
        answer: "Yes — this car has the full panoramic sunroof that opens across the whole cabin, not the smaller front-only unit fitted to lower-trim Q3s. It's the feature customers comment on most when they collect the car.",
      },
    ],
  },
  'bentley-bentayga-black-line-edition': {
    metaTitle: 'Rent Bentley Bentayga Black Line Edition in Dubai — Hire from AED 1,098/day',
    updatedAt: '2026-09-25',
    author: 'LuxeClub Editorial',
    description:
      "The Bentley Bentayga Black Line Edition is the standard Bentley Bentayga V8 finished in white with the factory Black Line styling pack — every piece of bright exterior chrome replaced with gloss-black trim. Under it is the 4.0-litre twin-turbo V8 producing 542bhp, an eight-speed automatic, all-wheel drive, and five seats. Priced from AED 1,098 per day, it's the fleet's option for anyone who wants a Bentley cabin, a full Bentley V8 drive, and a slightly more modern high-contrast aesthetic than the standard chrome-trimmed cars in our line-up. Available for rent in Dubai with delivery to your address, hotel, or DXB airport within Dubai limits. Deposit is AED 2,500. The first 250 km per day are included; the current daily rate is shown at the top of this page.\n\nThe Bentayga is what Bentley learned about SUV luxury translated into steel and hide, and the Black Line Edition takes that base and updates the visual signature for customers who find traditional Bentley chrome slightly dated. The paint is white; the styling pack blacks out the grille surround, the window frames, the roof rails, the exhaust surrounds, and the badging — the effect is a more contemporary high-contrast look without touching the mechanical package underneath.\n\nThat mechanical package is genuinely excellent. The 4.0-litre twin-turbo V8 produces 542bhp with a wall of torque available from around 2,000 rpm — enough to move a 2.4-tonne SUV to 100 km/h in the mid-four-second range without ever feeling stressed. The eight-speed automatic swaps ratios so cleanly you rarely notice it working. Air suspension in Comfort mode makes Dubai's speed bumps and parking-entry ramps a non-event; in Sport mode the ride firms up sensibly without ever getting harsh. Inside, this is the full Bentley experience: quilted diamond-stitched leather, real wood veneer, infotainment driven through knurled aluminium switchgear that feels much more expensive than the touch-only screens in most modern cars. Rear-seat space is genuine — two adults sit comfortably with abundant legroom — and the ride quality from the back seat is closer to a limousine than an SUV.\n\nThe Bentayga rents most often to two customer types. The first is a visiting family or business group who want the presence of a Bentley without the impracticality of the Continental GT (a coupé, not a family car) — arriving at a hotel valet or a business meeting in a Bentayga sets a tone that a Range Rover doesn't quite match. The second is a resident driver who wants a comfortable long-drive car for weekends: airport-to-Marina, Marina-to-Palm, day trips out to Abu Dhabi or to the beach at Palm Jumeirah. Standard Dubai destinations all handle it comfortably: DXB airport, DIFC and Downtown valets, the runs out to Address Sky View, FIVE Jumeirah Village, or the Address Hotel at Palm Jumeirah. Chauffeur customers particularly like the Black Line Edition — the modern contrasting look photographs better for corporate events and social media than traditional chrome. Minimum age is 24 for the Bentayga. Book two to three days ahead in season for weekend dates; the Black Line Edition is a specific-request car and availability is less flexible than the standard Bentayga variants. Delivery is AED 110 anywhere within Dubai. WhatsApp us on +971 58 808 6137 for weekly and monthly rates that fit your dates.\n\nWithin our fleet, the Black Line Edition sits alongside the standard black and brown Bentayga variants — same underlying car, different exterior treatment. If you want the classic chrome-trimmed Bentley silhouette, the standard Bentayga is the pick. If you want the more contemporary blacked-out look, this is it. Against the Rolls-Royce Cullinan (the fleet's most direct alternative in the ultra-luxury SUV band), the Bentayga is quicker, sharper to drive, and more engaging as a driver's car; the Cullinan is more spacious in the back, quieter still, and better suited to chauffeur-heavy weeks.",
    faqs: [
      {
        question: 'How much does it cost to rent a Bentley Bentayga Black Line Edition in Dubai?',
        answer: 'The current daily rate is shown at the top of this page. For weekly and monthly quotes, WhatsApp us on +971 58 808 6137 — we tailor pricing to your dates and duration. Every rental includes comprehensive insurance and Salik/Darb toll integration. Delivery is AED 110 anywhere within Dubai.',
      },
      {
        question: 'What is the minimum age to rent the Bentayga Black Line Edition?',
        answer: 'The minimum age is 24. Tourists need a valid International Driving Permit alongside their home-country licence; UAE residents just need their Emirates driving licence.',
      },
      {
        question: 'Can I take the Bentayga on longer runs to Abu Dhabi or Hatta?',
        answer: 'Yes. The Bentayga is at its best on longer motorway drives — the cabin refinement and adaptive air suspension make Abu Dhabi and the drive to Hatta genuinely relaxing. Our insurance covers the entire UAE. Cars cannot leave the UAE, so no drives into Oman or Saudi Arabia.',
      },
      {
        question: "What's the difference between the Black Line Edition and the standard Bentley Bentayga?",
        answer: 'Mechanically they are the same car — same 4.0L twin-turbo V8, same air suspension, same interior spec. The Black Line Edition replaces every piece of bright exterior chrome (grille surround, window frames, roof rails, badging, exhaust surrounds) with gloss-black trim, and this specific car is finished in white. If you want the classic chrome Bentayga look, the standard Bentayga in black or brown is what you\'re after. If you want the more modern contrasting look, this is the pick.',
      },
      {
        question: 'Is the Bentayga Black Line Edition suitable for family use?',
        answer: "Yes. Five adults fit comfortably, rear-seat legroom is closer to a chauffeur-driven saloon than a typical SUV, and the boot swallows airport luggage for four. It's one of the best family-capable luxury SUVs in the fleet alongside the Rolls-Royce Cullinan.",
      },
      {
        question: 'How far ahead should I book the Bentayga Black Line Edition?',
        answer: 'Two to three days ahead is comfortable for most windows; longer in high season (November to March) if you specifically want this Black Line variant. The standard Bentaygas in black or brown have more availability if your dates are tight.',
      },
    ],
  },
}
