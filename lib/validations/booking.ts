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
  .refine(
    (data) => {
      if (data.pickupMethod === 'delivery') {
        return !!data.deliveryAddress && data.deliveryAddress.trim().length > 0
      }
      return true
    },
    {
      message: 'Delivery address is required when delivery is selected',
      path: ['deliveryAddress'],
    }
  )
  .refine(
    (data) => {
      if (data.returnMethod === 'collection') {
        return !!data.collectionAddress && data.collectionAddress.trim().length > 0
      }
      return true
    },
    {
      message: 'Collection address is required when collection is selected',
      path: ['collectionAddress'],
    }
  )

/**
 * Step 3: Deposit — whether customer pays deposit or chooses no-deposit surcharge
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
    // Delivery step
    pickupMethod: z.enum(['delivery', 'self_pickup']),
    deliveryAddress: z.string().optional(),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    returnMethod: z.enum(['collection', 'self_dropoff']),
    collectionAddress: z.string().optional(),
    collectionLat: z.number().optional(),
    collectionLng: z.number().optional(),
    // Deposit step
    depositChoice: z.enum(['deposit', 'no_deposit']),
    // Guest contact step (optional — only present for guest checkout)
    guestName: z.string().optional(),
    guestEmail: z.string().optional(),
    guestPhone: z.string().optional(),
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
        return !!data.deliveryAddress && data.deliveryAddress.trim().length > 0
      }
      return true
    },
    {
      message: 'Delivery address is required when delivery is selected',
      path: ['deliveryAddress'],
    }
  )
  .refine(
    (data) => {
      if (data.returnMethod === 'collection') {
        return !!data.collectionAddress && data.collectionAddress.trim().length > 0
      }
      return true
    },
    {
      message: 'Collection address is required when collection is selected',
      path: ['collectionAddress'],
    }
  )

/**
 * Inferred TypeScript type from the combined booking schema.
 * Use this for form state and action parameters.
 */
export type BookingFormValues = z.infer<typeof bookingSchema>
