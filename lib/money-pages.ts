export interface MoneyPage {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  heading: string
  subheading: string
  content: string
  filter: {
    type: 'brand' | 'type' | 'keyword'
    value: string
  }
}

const SITE_URL = 'https://luxeclubrentals.com'

export const moneyPages: MoneyPage[] = [
  // ── Brand pages ──────────────────────────────────────────
  {
    slug: 'rent-lamborghini-in-dubai',
    title: 'Lamborghini Rental Dubai',
    metaTitle: 'Lamborghini Car Rental Dubai — Hire from AED 2,500/day | LuxeClub',
    metaDescription:
      'Lamborghini car rental in Dubai — Urus, Huracan, Revuelto available. Insurance included, free delivery across Dubai. Book online today.',
    heading: 'Lamborghini Car Rental Dubai',
    subheading: 'Drive one of the most iconic supercars on the planet. Delivered to your door anywhere in Dubai.',
    content:
      'Looking for Lamborghini car rental in Dubai? Whether you want the raw power of a Huracan on Sheikh Zayed Road or the luxury SUV experience of a Urus for a weekend trip, we have Lamborghinis ready to go. Every rental includes comprehensive insurance and free delivery across Dubai to your hotel, apartment, or the airport.',
    filter: { type: 'brand', value: 'Lamborghini' },
  },
  {
    slug: 'rent-ferrari-in-dubai',
    title: 'Ferrari Rental Dubai',
    metaTitle: 'Ferrari Car Rental Dubai — Hire from AED 2,500/day | LuxeClub',
    metaDescription:
      'Ferrari car rental in Dubai — Roma, Portofino, 488, F8 Tributo, SF90 available. Insurance included, free delivery across Dubai. Book your Ferrari today.',
    heading: 'Ferrari Car Rental Dubai',
    subheading: 'Nothing sounds like a Ferrari. Nothing drives like one either.',
    content:
      'Ferrari car rental in Dubai covers every mood — from the grand touring comfort of a Roma to the open-top thrill of a Portofino, our Ferrari fleet has you covered. Take one up Jebel Hafeet for sunset or cruise the Marina after dark. Insurance included, delivered to wherever you are staying in Dubai.',
    filter: { type: 'brand', value: 'Ferrari' },
  },
  {
    slug: 'rent-rolls-royce-in-dubai',
    title: 'Rolls Royce Rental Dubai',
    metaTitle: 'Rolls Royce Car Rental Dubai — Hire a Cullinan or Ghost | LuxeClub',
    metaDescription:
      'Rolls Royce car rental in Dubai — Ghost, Wraith, Dawn, Cullinan available. Chauffeur optional. Insurance and delivery included.',
    heading: 'Rolls Royce Car Rental Dubai',
    subheading: 'The ultimate statement. Delivered to your door.',
    content:
      'Rolls Royce car rental in Dubai is not just a car, it is an experience. Whether it is the Cullinan for a family trip, the Dawn for a coastal drive, or the Ghost for a business meeting in DIFC, we have you covered. Every car is detailed before handover and delivered anywhere in Dubai.',
    filter: { type: 'brand', value: 'Rolls Royce' },
  },
  {
    slug: 'rent-bentley-in-dubai',
    title: 'Bentley Rental Dubai',
    metaTitle: 'Bentley Car Rental Dubai — Hire a Continental GT or Bentayga | LuxeClub',
    metaDescription:
      'Bentley car rental in Dubai — Continental GT, Bentayga, Flying Spur available. Insurance included, free delivery across Dubai.',
    heading: 'Bentley Car Rental Dubai',
    subheading: 'British luxury, built for the open road.',
    content:
      'Bentley car rental in Dubai gives you access to some of the finest grand tourers ever built. The Continental GT is a masterpiece of a long-distance cruiser and Dubai has the roads to prove it. If you need space, the Bentayga is a luxury SUV that does not compromise. Insurance included, delivery across Dubai, and a full handover walkthrough before you set off.',
    filter: { type: 'brand', value: 'Bentley' },
  },
  {
    slug: 'rent-porsche-in-dubai',
    title: 'Porsche Rental Dubai',
    metaTitle: 'Porsche Car Rental Dubai — Hire a 911, Cayenne or Macan | LuxeClub',
    metaDescription:
      'Porsche car rental in Dubai — 911 Turbo S, 911 GT3, Cayenne, Macan available. Insurance included, free delivery across Dubai. Book online.',
    heading: 'Porsche Car Rental Dubai',
    subheading: 'The sports car that does everything. Perfectly.',
    content:
      'Porsche car rental in Dubai covers the whole lineup — the 911 Turbo S does 0-100 in 2.7 seconds and you can still hold a conversation inside. The Cayenne handles the desert roads with ease. Every rental comes with insurance, delivery across Dubai, and a walkthrough at handover.',
    filter: { type: 'brand', value: 'Porsche' },
  },
  {
    slug: 'rent-mercedes-in-dubai',
    title: 'Mercedes Rental Dubai',
    metaTitle: 'Mercedes Car Rental Dubai — Hire a G63 or AMG GT | LuxeClub',
    metaDescription:
      'Mercedes car rental in Dubai — AMG GT, G63, GLE, S-Class available. Insurance included, free delivery across Dubai.',
    heading: 'Mercedes Car Rental Dubai',
    subheading: 'From the G63 to the AMG GT. Power meets luxury.',
    content:
      'Mercedes car rental in Dubai starts with the G63, the most popular luxury SUV in the city for a reason. If you want something sportier, the AMG GT delivers serious performance. Every car is fully insured, detailed before handover, and delivered to your location anywhere in Dubai.',
    filter: { type: 'brand', value: 'Mercedes' },
  },
  {
    slug: 'rent-range-rover-in-dubai',
    title: 'Range Rover Rental Dubai',
    metaTitle: 'Range Rover Car Rental Dubai — Hire a Vogue or Sport | LuxeClub',
    metaDescription:
      'Range Rover car rental in Dubai — Vogue, Sport, Autobiography available. Insurance included, free delivery across Dubai.',
    heading: 'Range Rover Car Rental Dubai',
    subheading: 'The luxury SUV that goes anywhere.',
    content:
      'Range Rover car rental in Dubai is a staple for a reason — these are SUVs built for this city. Comfortable on the highway, capable off-road, and luxurious enough for any occasion. Whether you want the Vogue for a family trip or the Sport for something with more edge, we have it ready. Insurance and delivery included.',
    filter: { type: 'brand', value: 'Range Rover' },
  },
  {
    slug: 'rent-mclaren-in-dubai',
    title: 'McLaren Rental Dubai',
    metaTitle: 'McLaren Car Rental Dubai — Hire a 720S, 765LT or Artura | LuxeClub',
    metaDescription:
      'McLaren car rental in Dubai — 720S, 765LT, Artura, GT available. Insurance included, free delivery across Dubai. Book online.',
    heading: 'McLaren Car Rental Dubai',
    subheading: 'Formula 1 engineering for the road.',
    content:
      'McLaren car rental in Dubai gives you access to some of the most thrilling cars you can drive — lightweight, mid-engined, and devastatingly fast. Take one down Al Qudra or up Jebel Hafeet and you will understand why people fall in love with these cars. Insurance included, delivered anywhere in Dubai.',
    filter: { type: 'brand', value: 'McLaren' },
  },
  {
    slug: 'rent-aston-martin-in-dubai',
    title: 'Aston Martin Rental Dubai',
    metaTitle: 'Aston Martin Car Rental Dubai — Hire a DBX or Vantage | LuxeClub',
    metaDescription:
      'Aston Martin car rental in Dubai — DB11, Vantage, DBX 707 available. Insurance included, free delivery across Dubai. Book online.',
    heading: 'Aston Martin Car Rental Dubai',
    subheading: 'Understated British muscle.',
    content:
      'Aston Martin car rental in Dubai is for people who appreciate design as much as performance. The DB11 is one of the most beautiful grand tourers on sale, and the DBX is a proper luxury SUV with real presence. Every rental comes with full insurance and delivery across Dubai.',
    filter: { type: 'brand', value: 'Aston Martin' },
  },
  {
    slug: 'rent-bmw-in-dubai',
    title: 'BMW Rental Dubai',
    metaTitle: 'BMW Car Rental Dubai — Hire an M4, M5, X6 or X5 | LuxeClub',
    metaDescription:
      'BMW car rental in Dubai — M3, M4, M5 Competition, X5, X6 M available. Insurance included, free delivery across Dubai.',
    heading: 'BMW Car Rental Dubai',
    subheading: 'The ultimate driving machine. In the ultimate driving city.',
    content:
      'BMW car rental in Dubai covers everything from M-badged performance saloons to proper family SUVs. Whether it is an M4 Competition for spirited driving or an X6 for a comfortable family trip, the range covers all bases. Insurance included, delivered to your door, full handover walkthrough.',
    filter: { type: 'brand', value: 'BMW' },
  },
  {
    slug: 'rent-audi-in-dubai',
    title: 'Audi Rental Dubai',
    metaTitle: 'Audi Car Rental Dubai — Hire an RS7, R8 or RSQ8 | LuxeClub',
    metaDescription:
      'Audi car rental in Dubai — RS7, RS6, R8 Spyder, RSQ8 available. Insurance included, free delivery across Dubai. Book online.',
    heading: 'Audi Car Rental Dubai',
    subheading: 'Vorsprung durch Technik. Feel it on every corner.',
    content:
      'Audi car rental in Dubai is quietly one of the best value performance choices in the city. The RS7 is a four-door supercar, the R8 is mid-engined madness, and the RSQ8 is the fastest SUV most people will ever drive. Every rental includes insurance, delivery across Dubai, and a full handover walkthrough.',
    filter: { type: 'brand', value: 'Audi' },
  },
  {
    slug: 'rent-maserati-in-dubai',
    title: 'Maserati Rental Dubai',
    metaTitle: 'Maserati Car Rental Dubai — Hire an MC20 | LuxeClub',
    metaDescription:
      'Maserati car rental in Dubai — MC20, Levante, Ghibli available. Insurance included, free delivery across Dubai. Book online.',
    heading: 'Maserati Car Rental Dubai',
    subheading: 'Italian passion. Unmistakable exhaust note.',
    content:
      'Maserati car rental in Dubai is for those who want something different. The MC20 is a genuine mid-engined supercar, the Levante is a luxury SUV with real character, and nothing sounds quite like a Maserati V6 echoing off the Marina towers. Insurance and delivery included on every rental.',
    filter: { type: 'brand', value: 'Maserati' },
  },
  {
    slug: 'rent-cadillac-in-dubai',
    title: 'Cadillac Rental Dubai',
    metaTitle: 'Cadillac Car Rental Dubai — Hire an Escalade | LuxeClub',
    metaDescription:
      'Cadillac car rental in Dubai — Escalade Sports Platinum available. Insurance included, free delivery across Dubai. Book online.',
    heading: 'Cadillac Car Rental Dubai',
    subheading: 'American luxury. Bigger than everything else on the road.',
    content:
      'Cadillac car rental in Dubai means one thing — the Escalade. Massive presence, a cinema-quality interior, and enough space for the whole crew. Perfect for airport pickups, group trips, or just making an entrance. Insurance and delivery included.',
    filter: { type: 'brand', value: 'Cadillac' },
  },
  // ── Keyword-gap pages (from competitor research) ────────
  {
    slug: 'car-rental-dubai',
    title: 'Car Rental Dubai',
    metaTitle: 'Car Rental Dubai — Rent a Car from AED 800/day | LuxeClub',
    metaDescription:
      'Rent a car in Dubai with LuxeClub Rentals. Luxury, sports, and SUV cars available. Insurance included, free delivery across Dubai. Book online today.',
    heading: 'Car Rental Dubai',
    subheading: 'Luxury, sports, and SUV rentals delivered to your door across Dubai.',
    content:
      'Looking for a car rental in Dubai that actually delivers? LuxeClub Rentals offers a curated fleet of luxury and sports cars with transparent pricing, comprehensive insurance, and free delivery anywhere in Dubai. No hidden fees, no inflated deposits, no chasing for refunds. Whether you need a G63 for the weekend, a Ferrari for a special occasion, or a Range Rover for a family trip, we have you covered. Browse the fleet below and book online in minutes.',
    filter: { type: 'keyword', value: '' },
  },
  {
    slug: 'rent-exotic-car-in-dubai',
    title: 'Exotic Car Rental Dubai',
    metaTitle: 'Exotic Car Rental Dubai — Lamborghini, Ferrari, McLaren | LuxeClub',
    metaDescription:
      'Rent exotic cars in Dubai. Lamborghini, Ferrari, McLaren, Aston Martin and more. Insurance included, delivery across Dubai. Book your exotic car today.',
    heading: 'Exotic Car Rental Dubai',
    subheading: 'Drive the cars most people only see in photos.',
    content:
      'Dubai is one of the few places on Earth where driving an exotic car feels completely natural. The roads are built for it, the weather is perfect for it, and the city itself is the backdrop these cars were designed for. Our exotic fleet includes Lamborghini, Ferrari, McLaren, Aston Martin, and more. Every rental comes with comprehensive insurance and free delivery to your hotel, apartment, or the airport.',
    filter: { type: 'keyword', value: '' },
  },
  {
    slug: 'luxury-car-rental-no-deposit-dubai',
    title: 'Luxury Car Rental Dubai — Low Deposit',
    metaTitle: 'Luxury Car Rental Dubai No Deposit Hassle — Low Deposit | LuxeClub',
    metaDescription:
      'Rent luxury cars in Dubai with the lowest deposits in the market. Deposit equals just one day\'s rental. Full refund guaranteed. No hidden deductions.',
    heading: 'Luxury Car Rental Dubai — Low Deposit, No Hassle',
    subheading: 'Your deposit equals one day\'s rental. And you actually get it back.',
    content:
      'Tired of rental companies holding your deposit hostage? At LuxeClub, your security deposit is just one day\'s rental rate. Pay by credit card and no money even leaves your account — we place a hold that gets released once you return the car in good condition. No inflated deposits, no phantom deductions, no months of chasing. We document everything with timestamped photos at pickup and return so there are never any surprises. It is how car rental should work.',
    filter: { type: 'keyword', value: '' },
  },
  // ── Type pages ───────────────────────────────────────────
  {
    slug: 'rent-luxury-suv-in-dubai',
    title: 'Luxury SUV Rental Dubai',
    metaTitle: 'Luxury SUV Rental Dubai — Hire an SUV | LuxeClub',
    metaDescription:
      'Rent a luxury SUV in Dubai. Range Rover, G63, Bentayga, Cullinan, Urus and more. Insurance included, delivery across Dubai.',
    heading: 'Luxury SUV Rental Dubai',
    subheading: 'Space, comfort, and presence. The SUVs that turn heads in Dubai.',
    content:
      'Dubai was made for luxury SUVs. Wide highways, desert roads, and enough valet lines to appreciate the size and presence of a proper SUV. From the Rolls Royce Cullinan to the Lamborghini Urus, our SUV fleet covers the full spectrum. Insurance and delivery included on every rental.',
    filter: { type: 'type', value: 'SUV' },
  },
  {
    slug: 'rent-sports-car-in-dubai',
    title: 'Sports Car Rental Dubai',
    metaTitle: 'Sports Car Rental Dubai — Hire a Supercar | LuxeClub',
    metaDescription:
      'Rent a sports car in Dubai. Ferrari, Lamborghini, McLaren, Porsche and more. Insurance included, delivery across Dubai.',
    heading: 'Sports Car Rental Dubai',
    subheading: 'Life is too short to drive boring cars.',
    content:
      'Dubai has some of the best roads in the world for a sports car. Smooth highways, mountain passes, and desert straights where you can actually use the performance. Our fleet includes the biggest names in the business. Every car is fully insured and delivered to wherever you are staying.',
    filter: { type: 'type', value: 'Sports' },
  },
  {
    slug: 'rent-convertible-in-dubai',
    title: 'Convertible Rental Dubai',
    metaTitle: 'Convertible Rental Dubai — Hire a Convertible | LuxeClub',
    metaDescription:
      'Rent a convertible in Dubai. Ferrari Portofino, Rolls Royce Dawn, Bentley GTC and more. Insurance included, delivery across Dubai.',
    heading: 'Convertible Rental Dubai',
    subheading: 'Drop the top. Feel the Dubai sun.',
    content:
      'There is nothing quite like driving a convertible along the Dubai Marina at sunset. From the Ferrari Portofino to the Rolls Royce Dawn, our convertible fleet lets you experience Dubai the way it was meant to be experienced. Roof down, music on. Insurance and delivery included.',
    filter: { type: 'type', value: 'Convertible' },
  },
  // ── Generic money pages ──────────────────────────────────
  {
    slug: 'rent-luxury-car-in-dubai',
    title: 'Luxury Car Rental Dubai',
    metaTitle: 'Luxury Car Rental Dubai — Hire from AED 800/day | LuxeClub',
    metaDescription:
      'Rent luxury cars in Dubai. Ferrari, Lamborghini, Rolls Royce, Bentley, Range Rover and more. Insurance included, delivery across Dubai. Book online.',
    heading: 'Luxury Car Rental Dubai',
    subheading: 'The finest cars in Dubai, delivered to your door.',
    content:
      'LuxeClub Rentals offers a curated fleet of luxury and sports cars for rent in Dubai. Every car comes with comprehensive insurance, delivery across Dubai anywhere in Dubai, and a full handover walkthrough. Daily, weekend, and weekly rentals available. Browse the fleet below and book online.',
    filter: { type: 'keyword', value: '' },
  },
  {
    slug: 'rent-supercar-in-dubai',
    title: 'Supercar Rental Dubai',
    metaTitle: 'Supercar Rental Dubai — Hire a Supercar | LuxeClub',
    metaDescription:
      'Rent a supercar in Dubai. Lamborghini, Ferrari, McLaren, Porsche 911 Turbo S and more. Insurance included, delivered to your hotel.',
    heading: 'Supercar Rental Dubai',
    subheading: 'Supercars are not just for looking at. Drive one.',
    content:
      'Dubai is the supercar capital of the world and the best way to experience it is from behind the wheel. Our fleet includes Lamborghini, Ferrari, McLaren, Porsche, and more. Every car is insured, detailed before handover, and delivered to wherever you are in Dubai.',
    filter: { type: 'keyword', value: '' },
  },
  {
    slug: 'rent-cheap-car-in-dubai',
    title: 'Affordable Car Rental Dubai',
    metaTitle: 'Affordable Luxury Car Rental Dubai — From AED 800/day | LuxeClub',
    metaDescription:
      'Rent luxury cars in Dubai from AED 800/day. Transparent pricing, insurance included, no hidden fees. Browse our fleet and book online.',
    heading: 'Affordable Luxury Car Rental Dubai',
    subheading: 'Luxury does not have to break the bank.',
    content:
      'We keep our pricing transparent and competitive. Every rental includes comprehensive insurance, delivery across Dubai, and no hidden fees. No surprise Salik charges, no phantom fines, no cleaning fees. The price you see is the price you pay. Browse our fleet below sorted by daily rate.',
    filter: { type: 'keyword', value: '' },
  },
]

export function getMoneyPage(slug: string): MoneyPage | undefined {
  return moneyPages.find((p) => p.slug === slug)
}

export { SITE_URL }
