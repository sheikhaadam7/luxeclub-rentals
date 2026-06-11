import { z } from 'zod'

/**
 * Step 1: Duration — rental period type, dates, and optional pickup time
 */
export const durationStepSchema = z
  .object({
    durationType: z.enum(['daily', 'weekly', 'monthly']),
    startDate: z.date({ error: 'Start date is required' }),
    endDate: z.date({ error: 'End date is required' }),
    /** Optional pickup time in HH:MM format */
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
      .optional(),
    /** Optional dropoff time in HH:MM format */
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
      .optional(),
    /** Driver age bucket. Minimum 21 (under 24 cannot pick no-deposit option). */
    driverAge: z.enum(['21', '22', '23', '24', '25', '26', '27', '28', '29', '30+']),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })

/**
 * Step 2: Delivery — pickup and return method, with optional delivery address
 */
export const deliveryStepSchema = z
  .object({
    pickupMethod: z.enum(['delivery', 'self_pickup']),
    /** Required when pickupMethod is 'delivery' */
    deliveryAddress: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    returnMethod: z.enum(['collection', 'self_dropoff']),
    /** Required when returnMethod is 'collection' */
    collectionAddress: z.string().optional(),
    collectionLat: z.number().optional(),
    collectionLng: z.number().optional(),
  })

/**
 * Step 2 (new): Protection package — Basic or All Inclusive
 */
export const protectionStepSchema = z.object({
  protectionPackage: z.enum(['basic', 'inclusive']),
})

/**
 * Step 4 (was 3): Deposit — whether customer pays deposit or chooses no-deposit surcharge
 */
export const depositStepSchema = z.object({
  depositChoice: z.enum(['deposit', 'no_deposit']),
})

/**
 * Step 4 (guest): Contact — guest name, email, and phone
 */
export const contactStepSchema = z.object({
  guestName: z.string().min(1, 'Name is required'),
  guestEmail: z.string().email('Valid email is required'),
  guestPhone: z.string().min(7, 'Valid phone number is required'),
})

/**
 * Step 5: Payment — method for paying the rental total
 */
export const paymentStepSchema = z.object({
  paymentMethod: z.enum(['card', 'apple_pay', 'google_pay', 'cash', 'crypto']),
})

/**
 * Combined schema merging all wizard steps.
 * Used for final submission validation and type inference.
 */
export const bookingSchema = z
  .object({
    // Duration step
    durationType: z.enum(['daily', 'weekly', 'monthly']),
    startDate: z.date({ error: 'Start date is required' }),
    endDate: z.date({ error: 'End date is required' }),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
      .optional(),
    driverAge: z.enum(['21', '22', '23', '24', '25', '26', '27', '28', '29', '30+']),
    // Delivery step
    pickupMethod: z.enum(['delivery', 'self_pickup']),
    deliveryLocation: z
      .enum([
        'within_dubai',
        'al_maktoum_airport',
        'sharjah_airport',
        'sharjah_city',
        'ajman',
        'abu_dhabi',
        'al_ain',
        'fujairah',
        'ras_al_khaimah',
      ])
      .optional(),
    /** Free-text address + delivery instructions when zone === 'within_dubai'. */
    deliveryNotes: z.string().max(500).optional(),
    deliveryAddress: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    returnMethod: z.enum(['collection', 'self_dropoff']),
    collectionAddress: z.string().optional(),
    collectionLat: z.number().optional(),
    collectionLng: z.number().optional(),
    // Protection step (new — step 2)
    protectionPackage: z.enum(['basic', 'inclusive']),
    // Add-ons step (new — step 3)
    addons: z.object({
      additionalDriver: z.boolean(),
      personalDriver: z.boolean(),
      babySeat: z.boolean(),
      childSeat: z.boolean(),
    }),
    // Deposit choice — set via the No Deposit Option toggle on Add-ons step
    depositChoice: z.enum(['deposit', 'no_deposit']),
    // Guest contact step (optional — only present for guest checkout)
    guestName: z.string().optional(),
    guestEmail: z.string().optional(),
    guestPhone: z.string().optional(),
    // Review step (step 4) — driver details. First/Surname feed guestName on submit;
    // PhoneCountry + raw phone feed guestPhone. Company is informational for now.
    guestFirstName: z.string().max(80).optional(),
    guestSurname: z.string().max(80).optional(),
    guestPhoneCountry: z.string().max(8).optional(),
    guestCompany: z.string().max(120).optional(),
    // Optional VAT invoice address — opt-in via needsInvoiceAddress checkbox.
    needsInvoiceAddress: z.boolean().optional(),
    invoiceAddress: z
      .object({
        country: z.string().optional(),
        street: z.string().optional(),
        postcode: z.string().optional(),
        city: z.string().optional(),
      })
      .optional(),
    // Payment step
    paymentMethod: z.enum(['card', 'apple_pay', 'google_pay', 'cash', 'crypto']),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      if (data.pickupMethod === 'delivery') {
        return !!data.deliveryLocation
      }
      return true
    },
    {
      message: 'Please choose a delivery zone',
      path: ['deliveryLocation'],
    }
  )

/**
 * Inferred TypeScript type from the combined booking schema.
 * Use this for form state and action parameters.
 */
export type BookingFormValues = z.infer<typeof bookingSchema>
