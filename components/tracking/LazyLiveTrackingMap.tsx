'use client'

import dynamic from 'next/dynamic'

const LiveTrackingMap = dynamic(() => import('./LiveTrackingMap'), { ssr: false })

export default LiveTrackingMap
