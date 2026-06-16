import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import Taro from '@tarojs/taro'
import type { WaterfallData, IceQualityData, ProtectionPlan, RouteRecord, TemperatureAlert, IceQualityLevel } from '@/types'
import { mockWaterfalls, mockRoutes, mockAlerts } from '@/data/mockData'
import { checkCollapseRisk } from '@/utils/calculations'

const STORAGE_KEYS = {
  WATERFALLS: 'iceclimb_waterfalls',
  CURRENT_WATERFALL_ID: 'iceclimb_current_waterfall_id',
  QUALITY_DATA: 'iceclimb_quality_data',
  PROTECTION_PLANS: 'iceclimb_protection_plans',
  ROUTES: 'iceclimb_routes',
  ALERTS: 'iceclimb_alerts',
  CLIMBER_WEIGHT: 'iceclimb_climber_weight'
}

interface AppContextType {
  waterfalls: WaterfallData[]
  currentWaterfall: WaterfallData | null
  setCurrentWaterfall: (wf: WaterfallData | null) => void
  addWaterfall: (wf: WaterfallData) => void
  updateWaterfall: (id: string, updates: Partial<WaterfallData>) => void

  qualityData: Record<string, IceQualityData>
  setQualityData: (waterfallId: string, data: IceQualityData) => void

  protectionPlans: Record<string, ProtectionPlan>
  setProtectionPlan: (waterfallId: string, plan: ProtectionPlan) => void

  routes: RouteRecord[]
  addRoute: (route: RouteRecord) => void
  updateRoute: (id: string, route: Partial<RouteRecord>) => void
  upsertRouteFromWaterfall: (waterfallId: string, updates?: Partial<RouteRecord>) => void

  alerts: TemperatureAlert[]
  acknowledgeAlert: (id: string) => void
  recalculateAlerts: () => void

  climberWeight: number
  setClimberWeight: (weight: number) => void

  getCurrentQuality: () => IceQualityLevel
  getRouteForWaterfall: (waterfallId: string) => RouteRecord | undefined
  getStableRoutesForTemperature: (temp: number) => RouteRecord[]
}

const AppContext = createContext<AppContextType | null>(null)

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = Taro.getStorageSync(key)
    if (stored === '' || stored === undefined || stored === null) {
      return defaultValue
    }
    return stored as T
  } catch (e) {
    console.warn(`Failed to load ${key} from storage:`, e)
    return defaultValue
  }
}

const saveToStorage = (key: string, value: any) => {
  try {
    Taro.setStorageSync(key, value)
  } catch (e) {
    console.warn(`Failed to save ${key} to storage:`, e)
  }
}

const generateRouteFromWaterfall = (waterfall: WaterfallData, qualityData?: IceQualityData, protectionPlan?: ProtectionPlan): RouteRecord => {
  const now = new Date().toISOString()
  const level = qualityData?.overallLevel || 'C'
  const baseTempRange: Record<IceQualityLevel, [number, number]> = {
    A: [-20, 2],
    B: [-15, 1],
    C: [-10, 0],
    D: [-8, -2],
    E: [-5, -5]
  }

  const risks: RouteRecord['risks'] = []
  if (qualityData?.brittleAreas && qualityData.brittleAreas.length > 0) {
    qualityData.brittleAreas.forEach((area, idx) => {
      risks.push({
        id: `brittle-${idx}`,
        position: area.label,
        rootConnection: 'medium',
        hangingIce: area.severity === 'high',
        size: area.severity === 'high' ? 'large' : area.severity === 'medium' ? 'medium' : 'small',
        noStopZone: area.severity === 'high',
        riskLevel: area.severity
      })
    })
  }
  if (qualityData?.thinAreas && qualityData.thinAreas.length > 0) {
    qualityData.thinAreas.forEach((area, idx) => {
      risks.push({
        id: `thin-${idx}`,
        position: area.label,
        rootConnection: 'weak',
        hangingIce: false,
        size: area.severity === 'high' ? 'large' : area.severity === 'medium' ? 'medium' : 'small',
        noStopZone: area.severity === 'high',
        riskLevel: area.severity
      })
    })
  }

  return {
    id: `route-${waterfall.id}`,
    name: `${waterfall.name} - 标准线路`,
    waterfallId: waterfall.id,
    difficulty: level === 'A' || level === 'B' ? 'WI4' : level === 'C' ? 'WI5' : 'WI6',
    protectionPoints: protectionPlan?.totalPoints || (qualityData?.overallLevel ? Math.ceil(waterfall.height / 4) : 5),
    qualityLevel: level,
    temperatureRange: baseTempRange[level],
    photoUrls: waterfall.photoUrl ? [waterfall.photoUrl] : [],
    protectionPlan,
    qualityData,
    risks,
    createdAt: now,
    lastUpdated: now,
    notes: `基于${level}级冰质评估生成的标准保护线路。${qualityData ? `冰层厚度${qualityData.thickness}cm，气泡密度${qualityData.bubbleDensity}%。` : ''}`
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waterfalls, setWaterfalls] = useState<WaterfallData[]>(() => 
    loadFromStorage(STORAGE_KEYS.WATERFALLS, mockWaterfalls)
  )
  const [currentWaterfallId, setCurrentWaterfallId] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.CURRENT_WATERFALL_ID, mockWaterfalls[0]?.id || '')
  )
  const [qualityData, setQualityDataState] = useState<Record<string, IceQualityData>>(() => 
    loadFromStorage(STORAGE_KEYS.QUALITY_DATA, {})
  )
  const [protectionPlans, setProtectionPlansState] = useState<Record<string, ProtectionPlan>>(() => 
    loadFromStorage(STORAGE_KEYS.PROTECTION_PLANS, {})
  )
  const [routes, setRoutes] = useState<RouteRecord[]>(() => 
    loadFromStorage(STORAGE_KEYS.ROUTES, mockRoutes)
  )
  const [alerts, setAlerts] = useState<TemperatureAlert[]>(() => 
    loadFromStorage(STORAGE_KEYS.ALERTS, mockAlerts)
  )
  const [climberWeight, setClimberWeight] = useState<number>(() => 
    loadFromStorage(STORAGE_KEYS.CLIMBER_WEIGHT, 70)
  )

  const currentWaterfall = waterfalls.find(w => w.id === currentWaterfallId) || null

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.WATERFALLS, waterfalls)
  }, [waterfalls])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CURRENT_WATERFALL_ID, currentWaterfallId)
  }, [currentWaterfallId])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.QUALITY_DATA, qualityData)
  }, [qualityData])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROTECTION_PLANS, protectionPlans)
  }, [protectionPlans])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ROUTES, routes)
  }, [routes])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALERTS, alerts)
  }, [alerts])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CLIMBER_WEIGHT, climberWeight)
  }, [climberWeight])

  const getRouteForWaterfall = useCallback((waterfallId: string) => {
    return routes.find(r => r.waterfallId === waterfallId)
  }, [routes])

  const getStableRoutesForTemperature = useCallback((temp: number) => {
    return routes.filter(r => 
      temp >= r.temperatureRange[0] && temp <= r.temperatureRange[1]
    )
  }, [routes])

  const upsertRouteFromWaterfall = useCallback((waterfallId: string, updates?: Partial<RouteRecord>) => {
    const waterfall = waterfalls.find(w => w.id === waterfallId)
    if (!waterfall) return

    const existing = routes.find(r => r.waterfallId === waterfallId)
    const quality = qualityData[waterfallId]
    const plan = protectionPlans[waterfallId]

    if (existing) {
      const updated: RouteRecord = {
        ...existing,
        qualityLevel: quality?.overallLevel || existing.qualityLevel,
        protectionPoints: plan?.totalPoints || existing.protectionPoints,
        qualityData: quality || existing.qualityData,
        protectionPlan: plan || existing.protectionPlan,
        photoUrls: waterfall.photoUrl 
          ? [...new Set([...existing.photoUrls, waterfall.photoUrl])]
          : existing.photoUrls,
        lastUpdated: new Date().toISOString(),
        ...updates
      }
      setRoutes(prev => prev.map(r => r.id === existing.id ? updated : r))
      console.log('[AppContext] Route updated:', updated.id, 'level:', updated.qualityLevel, 'points:', updated.protectionPoints)
    } else {
      const newRoute = generateRouteFromWaterfall(waterfall, quality, plan)
      setRoutes(prev => [...prev, newRoute])
      console.log('[AppContext] Route created:', newRoute.id, 'level:', newRoute.qualityLevel, 'points:', newRoute.protectionPoints)
    }
  }, [waterfalls, qualityData, protectionPlans, routes])

  const recalculateAlerts = useCallback(() => {
    if (!currentWaterfall) return

    const level = getCurrentQuality()
    const { risk, message } = checkCollapseRisk(
      currentWaterfall.temperature,
      currentWaterfall.temperature24h,
      currentWaterfall.temperature72h,
      level
    )

    const newAlerts: TemperatureAlert[] = []
    const now = new Date().toISOString()

    const tempRise24h = currentWaterfall.temperature - currentWaterfall.temperature24h
    const tempRise72h = currentWaterfall.temperature - currentWaterfall.temperature72h

    if (tempRise24h > 5 || tempRise72h > 8) {
      newAlerts.push({
        id: `alert-rise-${currentWaterfall.id}-${Date.now()}`,
        type: 'rapid_rise',
        severity: tempRise24h > 8 ? 'danger' : 'warning',
        message: `24小时气温骤升${tempRise24h.toFixed(1)}℃，冰质稳定性下降`,
        temperatureNow: currentWaterfall.temperature,
        temperatureChange: tempRise24h,
        affectedRoutes: routes.filter(r => r.waterfallId === currentWaterfall.id).map(r => r.id),
        timestamp: now,
        acknowledged: false
      })
    }

    if (currentWaterfall.temperature > 0) {
      newAlerts.push({
        id: `alert-melt-${currentWaterfall.id}-${Date.now()}`,
        type: 'melting_risk',
        severity: currentWaterfall.temperature > 3 ? 'danger' : 'warning',
        message: `当前气温${currentWaterfall.temperature}℃，午后冰面可能开始融化`,
        temperatureNow: currentWaterfall.temperature,
        temperatureChange: currentWaterfall.temperature,
        affectedRoutes: routes.filter(r => r.waterfallId === currentWaterfall.id).map(r => r.id),
        timestamp: now,
        acknowledged: false
      })
    }

    if (risk === 'high' || risk === 'critical') {
      newAlerts.push({
        id: `alert-collapse-${currentWaterfall.id}-${Date.now()}`,
        type: 'collapse_risk',
        severity: risk === 'critical' ? 'critical' : 'danger',
        message,
        temperatureNow: currentWaterfall.temperature,
        temperatureChange: tempRise24h,
        affectedRoutes: routes.filter(r => r.waterfallId === currentWaterfall.id).map(r => r.id),
        timestamp: now,
        acknowledged: false
      })
    }

    const unacknowledgedOld = alerts.filter(a => !a.acknowledged && a.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    const merged = [...newAlerts, ...unacknowledgedOld]
    const unique = merged.filter((alert, index, self) =>
      index === self.findIndex(a => a.type === alert.type && a.temperatureNow === alert.temperatureNow)
    )

    setAlerts(unique)
    console.log('[AppContext] Alerts recalculated:', unique.length, 'collapse risk:', risk)
  }, [currentWaterfall, routes, alerts])

  const setCurrentWaterfall = useCallback((wf: WaterfallData | null) => {
    if (wf) {
      setCurrentWaterfallId(wf.id)
    }
  }, [])

  const addWaterfall = useCallback((wf: WaterfallData) => {
    setWaterfalls(prev => [...prev, wf])
    setCurrentWaterfallId(wf.id)
  }, [])

  const updateWaterfall = useCallback((id: string, updates: Partial<WaterfallData>) => {
    setWaterfalls(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
  }, [])

  const setQualityData = useCallback((waterfallId: string, data: IceQualityData) => {
    setQualityDataState(prev => ({ ...prev, [waterfallId]: data }))
    setTimeout(() => {
      upsertRouteFromWaterfall(waterfallId)
      recalculateAlerts()
    }, 50)
  }, [upsertRouteFromWaterfall, recalculateAlerts])

  const setProtectionPlan = useCallback((waterfallId: string, plan: ProtectionPlan) => {
    setProtectionPlansState(prev => ({ ...prev, [waterfallId]: plan }))
    setTimeout(() => {
      upsertRouteFromWaterfall(waterfallId)
    }, 50)
  }, [upsertRouteFromWaterfall])

  const addRoute = useCallback((route: RouteRecord) => {
    setRoutes(prev => [...prev, route])
  }, [])

  const updateRoute = useCallback((id: string, updates: Partial<RouteRecord>) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates, lastUpdated: new Date().toISOString() } : r))
  }, [])

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }, [])

  const setClimberWeightPersist = useCallback((weight: number) => {
    setClimberWeight(weight)
  }, [])

  const getCurrentQuality = useCallback((): IceQualityLevel => {
    if (!currentWaterfall) return 'C'
    const q = qualityData[currentWaterfall.id]
    if (q) return q.overallLevel
    const route = routes.find(r => r.waterfallId === currentWaterfall.id)
    return route?.qualityLevel || 'C'
  }, [currentWaterfall, qualityData, routes])

  useEffect(() => {
    if (currentWaterfall) {
      recalculateAlerts()
    }
  }, [currentWaterfall?.id, currentWaterfall?.temperature, currentWaterfall?.temperature24h, currentWaterfall?.temperature72h])

  return (
    <AppContext.Provider value={{
      waterfalls,
      currentWaterfall,
      setCurrentWaterfall,
      addWaterfall,
      updateWaterfall,
      qualityData,
      setQualityData,
      protectionPlans,
      setProtectionPlan,
      routes,
      addRoute,
      updateRoute,
      upsertRouteFromWaterfall,
      alerts,
      acknowledgeAlert,
      recalculateAlerts,
      climberWeight,
      setClimberWeight: setClimberWeightPersist,
      getCurrentQuality,
      getRouteForWaterfall,
      getStableRoutesForTemperature
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
