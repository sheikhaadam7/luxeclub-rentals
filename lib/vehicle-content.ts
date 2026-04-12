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
}

export const vehicleContentMap: Record<string, VehicleContent> = {
  'aston-martin-dbx-707': {
    metaTitle: 'Rent Aston Martin DBX 707 in Dubai — Hire from AED 2,500/day | LuxeClub',
    description:
      "The Aston Martin DBX 707 is the most powerful luxury SUV Aston Martin has ever built — a 4.0-litre twin-turbo V8 producing 697bhp, 0-100 in 3.3 seconds, and a surprisingly driver-focused chassis for a 2.2-tonne SUV. It's one of the best-kept secrets in the Dubai luxury rental market: comparable performance to a Lamborghini Urus at a lower daily rate, with a cabin that most customers find more refined than any German competitor.\n\nAston Martin DBX 707 car rental in Dubai starts at AED 2,500 per day, AED 11,900 per week (a 32% saving), or AED 37,500 per month. Every rental includes comprehensive insurance, free delivery across Dubai, 24/7 WhatsApp support, and a full handover walkthrough of the driving modes and air suspension settings. The reservation fee is AED 495, deducted from your total on pickup day.\n\nThe DBX 707 is particularly popular with business travellers who want presence at valet without the attention of a G63, and with families visiting Dubai who need genuine rear-seat space and luggage capacity. It handles the Sheikh Zayed Road run to Abu Dhabi as well as anything in the fleet, and the air suspension makes Dubai's speed bumps and parking-entry ramps genuinely comfortable.",
    faqs: [
      {
        question: 'How much does it cost to rent an Aston Martin DBX 707 in Dubai?',
        answer: 'The Aston Martin DBX 707 rents for AED 2,500 per day, AED 11,900 per week, or AED 37,500 per month. All rates include comprehensive insurance, free delivery across Dubai, and 24/7 support. Weekly rates save roughly 32% per day versus the daily rate.',
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
        answer: 'Yes — our insurance covers the entire UAE. Abu Dhabi is 1.5 hours each way from Dubai Marina. We recommend the unlimited-mileage upgrade for the round-trip since the standard 250 km/day allowance may not cover it.',
      },
    ],
  },
  'bmw-m3-competition': {
    metaTitle: 'Rent BMW M3 Competition in Dubai — Hire from AED 1,300/day | LuxeClub',
    description:
      "The BMW M3 Competition is the sharpest M-car in our fleet — a twin-turbo straight-six producing 503bhp, rear-wheel drive, 0-100 in 3.9 seconds, and the mid-corner precision that made M-cars the benchmark for performance saloons. At AED 1,300 per day it's also one of the best-value genuine performance car rentals in Dubai.\n\nBMW M3 Competition car rental in Dubai starts at AED 1,300 per day, AED 6,200 per week, or AED 19,500 per month. Every rental includes comprehensive insurance, free delivery across Dubai, 24/7 WhatsApp support, and a full handover walkthrough. The weekly rate saves roughly 32% per day.\n\nThe M3 Competition is ideal for enthusiast drivers who want to experience proper rear-wheel-drive dynamics on Jebel Jais, Hatta, or Sheikh Zayed Road without the supercar price tag. It's the car we recommend for first-time M-division customers — approachable enough to daily drive, rewarding enough to justify a dedicated mountain-road trip.",
    faqs: [
      {
        question: 'How much does it cost to rent a BMW M3 Competition in Dubai?',
        answer: 'The BMW M3 Competition rents for AED 1,300 per day, AED 6,200 per week, or AED 19,500 per month. All rates include comprehensive insurance, free delivery across Dubai, and 24/7 support.',
      },
      {
        question: 'Is the M3 Competition rear-wheel drive or all-wheel drive?',
        answer: 'Our M3 Competition is the rear-wheel-drive variant. This is the version most driving enthusiasts prefer because it offers a more engaging, adjustable driving experience — particularly on mountain roads like Jebel Jais where the rear-drive layout rewards throttle control.',
      },
      {
        question: 'Can I take the M3 Competition on Jebel Jais?',
        answer: "Yes — Jebel Jais is explicitly allowed under our rental terms. The 22 km of switchbacks are smooth tarmac with no speed cameras on the road itself, and the M3's chassis is in its element on the tight turns. Allow 3–4 hours round-trip from Dubai Marina and take the unlimited-mileage upgrade.",
      },
      {
        question: 'What is the minimum age to rent a BMW M3 Competition?',
        answer: 'The minimum age is 25. Tourists also need a valid International Driving Permit alongside their home-country licence.',
      },
    ],
  },
  'audi-rs6': {
    metaTitle: 'Rent Audi RS6 Avant in Dubai — Hire from AED 1,800/day | LuxeClub',
    description:
      "The Audi RS6 Avant is the estate car everyone secretly wants — a 4.0-litre twin-turbo V8 producing 591bhp, quattro all-wheel drive, 0-100 in 3.4 seconds, and the practical wagon body that makes it the perfect combination of supercar performance and family-car usability. It's the fastest estate car in our entire fleet.\n\nAudi RS6 car rental in Dubai starts at AED 1,800 per day, AED 8,550 per week, or AED 27,000 per month. Insurance, delivery, and 24/7 support are all included. The weekly rate saves roughly 32% per day versus the daily rate.\n\nThe RS6 is the car of choice for relocated European professionals and visiting German customers who already own an RS6 at home and want the same car in Dubai. It seats five adults plus luggage comfortably, handles Sheikh Zayed Road at 120 km/h without using half its capability, and still turns heads at valet stops. For customers who want genuine 591bhp performance without sacrificing an ounce of practicality, the RS6 has no real competitor in the fleet.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi RS6 in Dubai?',
        answer: 'The Audi RS6 Avant rents for AED 1,800 per day, AED 8,550 per week, or AED 27,000 per month. All rates include comprehensive insurance, free delivery across Dubai, and 24/7 support.',
      },
      {
        question: 'Is the RS6 good for a family trip in Dubai?',
        answer: "Yes — the RS6 Avant is an estate car that seats five adults comfortably with genuine boot space for luggage. It's one of the best family-friendly performance cars in the fleet. The quattro all-wheel drive also provides excellent stability in any weather conditions.",
      },
      {
        question: 'Can I drive the RS6 to Abu Dhabi?',
        answer: 'Yes — our insurance covers the entire UAE. The RS6 is one of the best cars in the fleet for the Abu Dhabi run — the V8 is relaxed at highway speeds, the cabin is quiet, and the quattro system provides excellent stability. Take the unlimited-mileage upgrade for the round-trip.',
      },
      {
        question: 'Why is the RS6 so popular in Dubai?',
        answer: 'The RS6 combines 591bhp supercar-level performance with genuine five-seat estate-car practicality. Dubai has a large German expat community who know and trust the RS badge, and the RS6 at AED 1,800/day offers dramatically more car per dirham than anything in the supercar segment. It can replace your daily car AND serve as a performance machine.',
      },
    ],
  },
  'audi-rs3': {
    metaTitle: 'Rent Audi RS3 in Dubai — Hire from AED 1,000/day | LuxeClub',
    description:
      "The Audi RS3 is the most affordable genuine performance car in our entire fleet — a 2.5-litre five-cylinder turbo producing 401bhp, quattro all-wheel drive, 0-100 in 3.8 seconds, and the distinctive five-cylinder engine note that has become an Audi RS signature. At AED 1,000 per day it's the entry point to proper performance car rental in Dubai.\n\nAudi RS3 car rental in Dubai starts at AED 1,000 per day, AED 4,750 per week, or AED 15,000 per month. Insurance, delivery, and 24/7 support are included. The weekly rate is an effective AED 679 per day — the cheapest performance car week in the Gulf market.\n\nThe RS3 is ideal for budget-conscious drivers who want genuine 400+bhp performance without the AED 2,500+ daily rates that supercars command. It's compact enough to park anywhere, easy to drive daily, and handles Hatta's mountain roads as well as any larger RS model. The minimum age is 23 — lower than any other performance car in the fleet.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi RS3 in Dubai?',
        answer: "The Audi RS3 rents for AED 1,000 per day, AED 4,750 per week, or AED 15,000 per month. It's the cheapest genuine performance car rental in our fleet. Insurance, delivery, and 24/7 support are included.",
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
        answer: "Yes — both are allowed under our rental terms. The RS3's compact size and quattro grip make it particularly enjoyable on Hatta's tight mountain roads. Take the unlimited-mileage upgrade for either trip.",
      },
    ],
  },
  'lamborghini-revuelto': {
    metaTitle: 'Rent Lamborghini Revuelto in Dubai — Hire from AED 12,000/day | LuxeClub',
    description:
      "The Lamborghini Revuelto is the flagship of the entire Dubai luxury rental market — a plug-in hybrid V12 hypercar producing 1,001bhp, 0-100 in 2.5 seconds, and a top speed over 350 km/h. It's one of maybe a dozen Revueltos available for rent anywhere in the world, and it is the single most requested car in our fleet.\n\nLamborghini Revuelto car rental in Dubai starts at AED 12,000 per day, AED 57,000 per week, or AED 180,000 per month. Every rental includes comprehensive insurance, free delivery across Dubai, 24/7 support, and an extended handover walkthrough covering the hybrid V12 drivetrain, the three electric motors, and the regeneration modes.\n\nThe Revuelto is the car for customers who want the absolute pinnacle of what's available in the Dubai market. It's louder, faster, and more theatrical than anything else you can rent — and the hybrid V12 sounds different from any Lamborghini that came before it. We recommend booking at least two weeks in advance for specific dates, particularly on weekends and during peak season (November to March).",
    faqs: [
      {
        question: 'How much does it cost to rent a Lamborghini Revuelto in Dubai?',
        answer: 'The Lamborghini Revuelto rents for AED 12,000 per day, AED 57,000 per week (a 32% per-day saving), or AED 180,000 per month. All rates include comprehensive insurance, free delivery, and 24/7 support.',
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
    metaTitle: 'Rent Porsche 911 GT3 RS in Dubai — Hire from AED 6,500/day | LuxeClub',
    description:
      "The Porsche 911 GT3 RS is the most extreme road-legal 911 ever built — a 518bhp naturally-aspirated flat-six that revs to 9,000 rpm, active DRS-style rear wing, race-derived suspension, and enough downforce to make Jebel Jais feel like a racing circuit. It is, by any objective measure, one of the best driver's cars in the world.\n\nPorsche 911 GT3 RS car rental in Dubai starts at AED 6,500 per day, AED 30,900 per week, or AED 97,500 per month. Insurance, delivery, and 24/7 support are included. The handover walkthrough covers the active aero system, the DRS rear wing, the chassis settings, and the launch control.\n\nThe GT3 RS is the car for experienced drivers who know exactly what they want. It is not a comfortable cruiser — the ride is firm, the cabin is loud, and the car demands your full attention. In return it delivers a driving experience that nothing else in the fleet can match. Take it to Jebel Jais at sunrise with the unlimited-mileage upgrade and you'll understand why Porsche enthusiasts consider the GT3 RS the best car the company has ever built.",
    faqs: [
      {
        question: 'How much does it cost to rent a Porsche 911 GT3 RS in Dubai?',
        answer: 'The Porsche 911 GT3 RS rents for AED 6,500 per day, AED 30,900 per week, or AED 97,500 per month. All rates include comprehensive insurance, free delivery, and 24/7 support.',
      },
      {
        question: 'Is the GT3 RS comfortable for daily driving?',
        answer: "Honestly, no — the GT3 RS is a track-focused car with a firm ride, loud cabin, and demanding driving character. It's extraordinary on mountain roads and highway blasts but not the right choice for a week of comfortable daily driving. If you want the 911 experience with daily comfort, the 911 Turbo S or 911 Carrera S Cabriolet are better choices. The GT3 RS is for enthusiasts who want a specific, intense driving experience.",
      },
      {
        question: 'Can I take the GT3 RS on Jebel Jais?',
        answer: "Yes — and you absolutely should. Jebel Jais is the single best road in the UAE for the GT3 RS. The 22 km of switchbacks reward the naturally-aspirated flat-six's high-rpm power delivery and the active aero keeps the car planted through every corner. Allow 3–4 hours round-trip and take the unlimited-mileage upgrade.",
      },
      {
        question: 'What does the DRS rear wing do?',
        answer: "The GT3 RS's rear wing has an active DRS (drag reduction system) mode — similar to what Formula 1 cars use. On straights the wing flattens to reduce drag, and in corners it extends to maximum angle for downforce. The system is automatic but can be overridden in the drive modes. We'll demonstrate all of this during the handover walkthrough at pickup.",
      },
    ],
  },
  'ferrari-sf90-stradale': {
    metaTitle: 'Rent Ferrari SF90 Stradale in Dubai — Hire from AED 7,500/day | LuxeClub',
    description:
      "The Ferrari SF90 Stradale is the fastest production Ferrari ever built — a plug-in hybrid V8 producing 986bhp combined from a twin-turbo V8 and three electric motors, 0-100 in 2.5 seconds, and the most technologically advanced car in the Ferrari lineup. It bridges the gap between supercar and hypercar.\n\nFerrari SF90 Stradale car rental in Dubai starts at AED 7,500 per day, AED 35,650 per week, or AED 112,500 per month. Insurance, delivery, and 24/7 support are included. The handover walkthrough covers the hybrid drivetrain modes (eDrive for electric-only, Hybrid for combined, Performance and Qualify for maximum power).\n\nThe SF90 is for customers who want Ferrari's absolute best — the technology, the speed, and the bragging rights of the fastest car in the Prancing Horse stable. On Sheikh Zayed Road it accelerates with a violence that makes the regular F8 Tributo feel pedestrian. At AED 7,500/day it sits between the mainstream Ferrari range and the Lamborghini Revuelto, making it the value choice for customers who want near-hypercar performance without the AED 12,000/day Revuelto price.",
    faqs: [
      {
        question: 'How much does it cost to rent a Ferrari SF90 Stradale in Dubai?',
        answer: 'The Ferrari SF90 Stradale rents for AED 7,500 per day, AED 35,650 per week, or AED 112,500 per month. All rates include comprehensive insurance, free delivery, and 24/7 support.',
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
        answer: 'Both are hybrid hypercars but they feel very different. The SF90 has a V8 + three electric motors (986bhp) while the Revuelto has a V12 + three electric motors (1,001bhp). The SF90 feels more surgical and technology-led; the Revuelto is more theatrical and emotionally overwhelming. The SF90 at AED 7,500/day is significantly cheaper than the Revuelto at AED 12,000/day, making it the value hypercar choice.',
      },
    ],
  },
  'rolls-royce-culli-mansory': {
    metaTitle: 'Rent Rolls-Royce Cullinan Mansory in Dubai — Hire from AED 5,000/day | LuxeClub',
    description:
      "The Rolls-Royce Cullinan Mansory is the most presence-heavy car in our entire fleet — a 6.75-litre twin-turbo V12 wrapped in a Mansory carbon-fibre aero kit, finished inside with lambswool rugs, a starlight headliner, and a rear cabin that rivals the best first-class airline seats. It doesn't just arrive — it changes the atmosphere of wherever you pull up.\n\nRolls-Royce Cullinan Mansory car rental in Dubai starts at AED 5,000 per day, AED 23,750 per week, or AED 75,000 per month. Insurance, white-glove delivery, and 24/7 support are included. Chauffeur service is available as an add-on, particularly popular for wedding bookings and business events.\n\nThe Cullinan Mansory is the car for occasions where the arrival matters as much as the destination — weddings, business signings, family visits where you want something exceptional, and any event where you want the most impressive car available in the Dubai rental market. We recommend booking at least two weeks in advance during peak season (November to March).",
    faqs: [
      {
        question: 'How much does it cost to rent a Rolls-Royce Cullinan Mansory in Dubai?',
        answer: 'The Cullinan Mansory rents for AED 5,000 per day, AED 23,750 per week, or AED 75,000 per month. All rates include comprehensive insurance, white-glove delivery, and 24/7 support. Chauffeur service is available as an add-on.',
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
    metaTitle: 'Rent Range Rover Vogue HSE in Dubai — Hire from AED 1,800/day | LuxeClub',
    description:
      "The Range Rover Vogue HSE is the definitive luxury SUV for Dubai — a comfortable long-distance cruiser with exceptional ride quality, genuine off-road capability, and enough rear legroom to work as a business saloon replacement. It's the car Dubai residents choose for their own daily driving, which tells you everything about how well it suits the city.\n\nRange Rover Vogue HSE car rental in Dubai starts at AED 1,800 per day, AED 8,550 per week, or AED 27,000 per month. Insurance, delivery, and 24/7 support are included. The weekly rate saves roughly 32% per day.\n\nThe Vogue HSE is the most popular family SUV in our fleet. It handles airport pickups, school runs, Hatta day trips, and DIFC business dinners without compromising on any of them. The air suspension flattens Dubai's speed bumps and the cabin is quiet enough for rear passengers to sleep on the Abu Dhabi run.",
    faqs: [
      {
        question: 'How much does it cost to rent a Range Rover Vogue HSE in Dubai?',
        answer: 'The Range Rover Vogue HSE rents for AED 1,800 per day, AED 8,550 per week, or AED 27,000 per month. All rates include comprehensive insurance, free delivery across Dubai, and 24/7 support.',
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
    metaTitle: 'Rent Audi RSQ8 in Dubai — Hire from AED 1,400/day | LuxeClub',
    description:
      "The Audi RSQ8 is a 4.0-litre twin-turbo V8 performance SUV producing 591bhp — making it faster than a Lamborghini Urus in most real-world driving scenarios despite the lower headline power figure, because of the chassis tuning and quattro all-wheel-drive system. 0-100 in 3.8 seconds, a top speed of 305 km/h, and a cabin that feels like a luxury saloon rather than an SUV.\n\nAudi RSQ8 car rental in Dubai starts at AED 1,400 per day, AED 6,650 per week, or AED 21,000 per month. Insurance, delivery, and 24/7 support are included.\n\nThe RSQ8 is the performance SUV for customers who want serious speed without sacrificing practicality. It seats five adults comfortably, has a proper boot, and handles Dubai traffic with the kind of effortless torque that makes rush-hour overtaking feel safe rather than dramatic. At AED 1,400/day it's also one of the best-value performance SUVs in the whole Dubai rental market — substantially cheaper than the Urus (AED 3,000) while offering comparable straight-line pace.",
    faqs: [
      {
        question: 'How much does it cost to rent an Audi RSQ8 in Dubai?',
        answer: 'The Audi RSQ8 rents for AED 1,400 per day, AED 6,650 per week, or AED 21,000 per month. All rates include comprehensive insurance, free delivery across Dubai, and 24/7 support.',
      },
      {
        question: 'How does the RSQ8 compare to the Lamborghini Urus?',
        answer: "The RSQ8 and Urus share the same Volkswagen Group platform and similar twin-turbo V8 engines. The Urus has more power on paper (641bhp vs 591bhp) but the RSQ8's chassis tuning makes it faster in many real-world scenarios. The RSQ8 also costs AED 1,400/day versus AED 3,000/day for the Urus — roughly half the price for ~90% of the performance. If you want the Lamborghini badge, rent the Urus. If you want the best-value performance SUV in Dubai, rent the RSQ8.",
      },
      {
        question: 'Is the RSQ8 good for families?',
        answer: 'Yes — the RSQ8 seats five adults comfortably with a practical boot. It combines genuine supercar-level performance (0-100 in 3.8 seconds) with everyday SUV usability. The ride quality is firmer than a Range Rover but still comfortable for long drives.',
      },
      {
        question: 'What is the minimum age to rent an RSQ8?',
        answer: 'The minimum age is 25. Tourists also need a valid International Driving Permit alongside their home-country licence.',
      },
    ],
  },
  'ferrari-purosangue': {
    metaTitle: 'Rent Ferrari Purosangue in Dubai — Hire from AED 11,000/day | LuxeClub',
    description:
      "The Ferrari Purosangue is Ferrari's first four-door, four-seat car — and arguably the most controversial vehicle in the company's history. A naturally-aspirated 6.5-litre V12 producing 715bhp, 0-100 in 3.3 seconds, rear suicide doors, and a chassis that somehow feels like a Ferrari despite weighing over 2 tonnes. It is the only car in our fleet where a family of four can travel together in a genuine Ferrari.\n\nFerrari Purosangue car rental in Dubai starts at AED 11,000 per day, AED 52,250 per week, or AED 165,000 per month. Insurance, delivery, and 24/7 support are included.\n\nThe Purosangue is for customers who want the Ferrari experience — the V12 soundtrack, the chassis dynamics, the badge — but need four doors and four seats. It's popular with families, business delegations, and anyone who wants to prove that Ferrari's first SUV was worth the controversy. The naturally-aspirated V12 is the same engine family that powered the 812 Superfast, and it sounds extraordinary.",
    faqs: [
      {
        question: 'How much does it cost to rent a Ferrari Purosangue in Dubai?',
        answer: 'The Ferrari Purosangue rents for AED 11,000 per day, AED 52,250 per week, or AED 165,000 per month. All rates include comprehensive insurance, free delivery, and 24/7 support.',
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
}
