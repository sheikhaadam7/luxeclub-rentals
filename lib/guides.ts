export interface GuideSection {
  heading: string
  content: string
}

export interface Guide {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  publishedDate: string
  sections: GuideSection[]
}

export const guides: Guide[] = [
  {
    slug: 'dubai-driving-rules-for-tourists',
    title: 'Dubai Driving Rules for Tourists (2026)',
    metaTitle: 'Dubai Driving Rules for Tourists (2026) — What You Need to Know',
    metaDescription:
      'Complete guide to driving in Dubai as a tourist. Licence requirements, speed limits, Salik tolls, parking, fuel prices, and tips to avoid fines.',
    publishedDate: '2026-01-15',
    sections: [
      {
        heading: 'Driving Licence Requirements',
        content:
          'Tourists from GCC countries, the US, UK, Canada, Australia, and most EU nations can drive in Dubai using their home country licence. If your country is not on the recognised list, you will need a valid International Driving Permit (IDP) alongside your home licence. IDPs must be obtained before you travel — you cannot get one in the UAE.\n\nUAE residents need a valid UAE driving licence. Your rental company will ask for a copy at pickup, so keep a photo on your phone as a backup. The minimum driving age in Dubai is 18, but most rental companies require drivers to be at least 21, and some set the bar at 25 for high-performance vehicles.',
      },
      {
        heading: 'Speed Limits & Radar Tolerance',
        content:
          'Speed limits in Dubai are clearly posted and strictly enforced by fixed and mobile radar cameras. In residential and urban areas the limit is typically 40–60 km/h. Main city roads like Sheikh Zayed Road have limits of 100–120 km/h, while some highway stretches outside the city allow up to 140 km/h.\n\nDubai Police radars activate at 121 km/h in a 120 zone — the old 20 km/h buffer was reduced to just 1 km/h in recent years. Fines start at AED 300 for minor speeding and can reach AED 3,000 for exceeding the limit by more than 80 km/h, which also carries 23 black points, vehicle impoundment, and a possible licence suspension.',
      },
      {
        heading: 'Salik Toll Gates',
        content:
          'Salik is Dubai\u2019s electronic toll system. There are currently eight toll gates across the city, including on Sheikh Zayed Road, Al Maktoum Bridge, Al Garhoud Bridge, and Business Bay Crossing. Each pass costs AED 4 and is automatically deducted when you drive through.\n\nWhen renting a car, your rental company will either provide a Salik tag pre-loaded on the vehicle or charge tolls to your account after the trip. Ask your rental provider about their Salik policy before you drive off — some add a small admin fee per toll.',
      },
      {
        heading: 'Parking Rules & Fines',
        content:
          'Dubai uses the RTA mParking system. Paid parking zones are colour-coded: orange and blue zones are metered (AED 2–4 per hour) and operate from 8 AM to 10 PM, while grey zones are premium areas near malls and business districts.\n\nYou can pay via the RTA app, SMS, or parking meters. Double parking, parking on pavements, or blocking driveways will earn you an AED 1,000 fine. Always check signage — some streets switch to no-parking during rush hours. Most shopping malls offer free parking for the first few hours.',
      },
      {
        heading: 'Fuel & Petrol Stations',
        content:
          'The UAE has some of the cheapest fuel in the world. Prices are set monthly by the government and displayed per litre. As of early 2026, Super 98 costs around AED 2.80/litre and Special 95 around AED 2.70/litre.\n\nPetrol stations are plentiful across Dubai. Many are full-service — an attendant fills your tank while you stay in the car. Most accept card payments at the pump. Your rental car should be returned with the same fuel level it was collected at, or you may be charged a refuelling fee.',
      },
      {
        heading: 'Essential Tips to Avoid Fines',
        content:
          'Always wear your seatbelt — front and rear passengers alike. The fine for not wearing a seatbelt is AED 400. Using a mobile phone while driving carries an AED 800 fine and 4 black points.\n\nDo not make rude gestures or use aggressive language towards other drivers. Under UAE law, this can result in criminal charges, not just traffic fines. Keep a respectful distance from the car ahead — tailgating is heavily penalised on highways.\n\nGive way to emergency vehicles immediately. Blocking an ambulance or police car carries a fine of AED 1,000. During the holy month of Ramadan, eating, drinking, or smoking in public during daylight hours is prohibited, including inside your car if windows are down.',
      },
    ],
  },
  {
    slug: 'best-driving-roads-dubai-uae',
    title: 'The 7 Best Driving Roads in Dubai & the UAE',
    metaTitle: 'The 7 Best Driving Roads in Dubai & the UAE — Scenic Routes for 2026',
    metaDescription:
      'Discover the most spectacular driving roads in the UAE. From mountain switchbacks on Jebel Jais to the iconic Sheikh Zayed Road — the ultimate guide for car enthusiasts.',
    publishedDate: '2026-02-01',
    sections: [
      {
        heading: 'Jebel Jais Mountain Road, Ras Al Khaimah',
        content:
          'The crown jewel of UAE driving roads. Jebel Jais is the highest peak in the UAE at 1,934 metres, and the road to the summit is a masterpiece of modern engineering — 30 kilometres of smooth, perfectly banked switchbacks carved into the Hajar Mountains.\n\nThe route climbs from sea level through dramatic limestone gorges with hairpin turns that beg for a responsive steering wheel. Pull over at the designated viewpoints to take in vistas stretching to the Arabian Gulf. The road is well-maintained with clear signage and guardrails throughout. Best driven early morning when the air is cool and the light catches the rock faces. About 90 minutes from Dubai.',
      },
      {
        heading: 'Sheikh Zayed Road (E11)',
        content:
          'The backbone of Dubai and arguably the most famous road in the Middle East. This 12-lane highway cuts through the heart of the city, flanked by the world\u2019s most dramatic skyline — Burj Khalifa, Emirates Towers, and the Museum of the Future all tower above you as you cruise.\n\nAt night, the road transforms into a river of light with the illuminated skyscrapers creating an unforgettable backdrop. The speed limit is 120 km/h and the road surface is immaculate. For the full experience, drive the stretch between Dubai Marina and Downtown Dubai after 10 PM when traffic thins out. Just watch for the Salik toll gates.',
      },
      {
        heading: 'Al Qudra Road (D63)',
        content:
          'A 75-kilometre stretch of arrow-straight desert highway that runs from Dubai\u2019s southern suburbs deep into the golden dunes. Al Qudra is the road where Dubai\u2019s supercar owners come to stretch their legs — the surface is glass-smooth, traffic is minimal, and the desert landscape is hypnotic.\n\nThe road passes Al Qudra Lakes, an unexpected oasis in the desert where you can spot flamingos and other wildlife. Further along, you will reach the Love Lakes — two interconnected heart-shaped lakes visible from the air. The speed limit is 100–120 km/h. Best enjoyed during golden hour when the dunes glow amber on either side.',
      },
      {
        heading: 'Hatta Mountain Road (E44)',
        content:
          'The drive to Hatta takes you from the flat coastal plains of Dubai into the rugged Hajar Mountains over about 130 kilometres. The road winds through rocky wadis, past honey-coloured villages, and alongside the stunning turquoise waters of the Hatta Dam.\n\nThe final approach into Hatta features a beautiful series of curves through mountain valleys with almost zero traffic. Hatta itself is a charming heritage village with kayaking on the dam, mountain biking trails, and the Hatta Wadi Hub for adventure activities. Allow a full day and combine the drive with a stop at the Hatta Heritage Village. The road is well-paved throughout.',
      },
      {
        heading: 'Jebel Hafeet, Al Ain',
        content:
          'Often called one of the greatest driving roads in the world. The 12-kilometre ascent of Jebel Hafeet rises 1,240 metres above the desert floor through 60 corners of beautifully engineered tarmac. The road was built to European mountain pass standards with wide lanes, perfect camber, and smooth transitions.\n\nFrom the summit, the 360-degree panorama over the empty desert and the oasis city of Al Ain below is breathtaking. The road is a favourite of the UAE\u2019s supercar community and you will often see Ferraris, Lamborghinis, and Porsches making the climb. About 90 minutes from Dubai. The best time is late afternoon — drive up for sunset, then descend as the city lights flicker on below.',
      },
      {
        heading: 'Kalba Coastal Road (E99)',
        content:
          'The drive from Fujairah to Kalba along the E99 hugs the Gulf of Oman coastline for roughly 40 kilometres of pure coastal bliss. Rocky cliffs drop into turquoise water on one side while the Hajar Mountains rise on the other.\n\nThis is the UAE\u2019s answer to a Mediterranean corniche — sweeping ocean-view curves, fishing villages, and empty beaches where you can pull over and have the sand to yourself. The road is two lanes in places, so overtaking opportunities are limited, but the pace suits the scenery. Combine it with a visit to Kalba\u2019s mangrove reserve or the Shark Island snorkelling spot. About two hours from Dubai.',
      },
      {
        heading: 'Dubai to Liwa Oasis via the E45',
        content:
          'The ultimate desert road trip. The E45 runs south from Abu Dhabi into the Rub al Khali — the Empty Quarter — ending at the Liwa Oasis, a crescent of date palm villages on the edge of the largest sand desert on Earth.\n\nThe drive covers about 300 kilometres from Dubai and the landscape shifts dramatically as you go — from urban sprawl to flat gravel plains to towering orange sand dunes that can reach 300 metres high. The road itself is beautifully maintained, a thin ribbon of tarmac cutting through an ocean of sand. Stop at Moreeb Dune, one of the tallest sand dunes in the world, for photos. Allow a full day or stay overnight at the Qasr Al Sarab resort for the full Lawrence of Arabia experience.',
      },
    ],
  },
]
