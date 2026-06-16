import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import Taro from '@tarojs/taro'
import type { WaterfallData, IceQualityData, ProtectionPlan, RouteRecord, TemperatureAlert, IceQualityLevel } from '@/types'
import { mockWaterfalls, mockRoutes } from '@/data/mockData'
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

  currentAlerts: TemperatureAlert[]
  allAlerts: Record<string, TemperatureAlert[]>
  acknowledgeAlert: (waterfallId: string, alertId: string) => void
  recalculateAlerts: (waterfallId?: string) => void

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

const generateAlertsForWaterfall = (waterfall: WaterfallData, level: IceQualityLevel, routes: RouteRecord[]): TemperatureAlert[] => {
  const alerts: TemperatureAlert[] = []
  const now = new Date().toISOString()

  const tempRise24h = waterfall.temperature - waterfall.temperature24h
  const tempRise72h = waterfall.temperature - waterfall.temperature72h
  const { risk, message } = checkCollapseRisk(
    waterfall.temperature,
    waterfall.temperature24h,
    waterfall.temperature72h,
    level
  )

  const affectedRouteIds = routes.filter(r => r.waterfallId === waterfall.id).map(r => r.id)

  if (tempRise24h > 5 || tempRise72h > 8) {
    alerts.push({
      id: `alert-rise-${waterfall.id}`,
      type: 'rapid_rise',
      severity: tempRise24h > 8 ? 'danger' : 'warning',
      message: `24小时气温骤升${tempRise24h.toFixed(1)}℃，冰质稳定性下降`,
      temperatureNow: waterfall.temperature,
      temperatureChange: tempRise24h,
      affectedRoutes: affectedRouteIds,
      timestamp: now,
      acknowledged: false
    })
  }

  if (waterfall.temperature > 0) {
    alerts.push({
      id: `alert-melt-${waterfall.id}`,
      type: 'melting_risk',
      severity: waterfall.temperature > 3 ? 'danger' : 'warning',
      message: `当前气温${waterfall.temperature}℃，午后冰面可能开始融化`,
      temperatureNow: waterfall.temperature,
      temperatureChange: waterfall.temperature,
      affectedRoutes: affectedRouteIds,
      timestamp: now,
      acknowledged: false
    })
  }

  if (risk === 'high' || risk === 'critical') {
    alerts.push({
      id: `alert-collapse-${waterfall.id}`,
      type: 'collapse_risk',
      severity: risk === 'critical' ? 'critical' : 'danger',
      message,
      temperatureNow: waterfall.temperature,
      temperatureChange: tempRise24h,
      affectedRoutes: affectedRouteIds,
      timestamp: now,
      acknowledged: false
    })
  }

  return alerts
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
  const [allAlerts, setAllAlerts] = useState<Record<string, TemperatureAlert[]>>(() => 
    loadFromStorage(STORAGE_KEYS.ALERTS, {})
  )
  const [climberWeight, setClimberWeight] = useState<number>(() => 
    loadFromStorage(STORAGE_KEYS.CLIMBER_WEIGHT, 70)
  )

  const currentWaterfall = waterfalls.find(w => w.id === currentWaterfallId) || null

  const currentAlerts = useMemo(() => {
    if (!currentWaterfall) return []
    return allAlerts[currentWaterfall.id] || []
  }, [currentWaterfall, allAlerts])

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
    saveToStorage(STORAGE_KEYS.ALERTS, allAlerts)
  }, [allAlerts])

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

  const getQualityForWaterfall = useCallback((waterfallId: string): IceQualityLevel => {
    const q = qualityData[waterfallId]
    if (q) return q.overallLevel
    const route = routes.find(r => r.waterfallId === waterfallId)
    return route?.qualityLevel || 'C'
  }, [qualityData, routes])

  const getCurrentQuality = useCallback((): IceQualityLevel => {
    if (!currentWaterfall) return 'C'
    return getQualityForWaterfall(currentWaterfall.id)
  }, [currentWaterfall, getQualityForWaterfall])

  const upsertRouteFromWaterfall = useCallback((waterfallId: string, updates?: Partial<RouteRecord>) => {
    const waterfall = waterfalls.find(w => w.id === waterfallId)
    if (!waterfall) return

    const quality = qualityData[waterfallId]
    const plan = protectionPlans[waterfallId]

    setRoutes(prevRoutes => {
      const existing = prevRoutes.find(r => r.waterfallId === waterfallId)
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
        console.log('[AppContext] Route updated:', updated.id, 'level:', updated.qualityLevel, 'points:', updated.protectionPoints)
        return prevRoutes.map(r => r.id === existing.id ? updated : r)
      } else {
        const newRoute = generateRouteFromWaterfall(waterfall, quality, plan)
        console.log('[AppContext] Route created:', newRoute.id, 'level:', newRoute.qualityLevel, 'points:', newRoute.protectionPoints)
        return [...prevRoutes, newRoute]
      }
    })
  }, [waterfalls, qualityData, protectionPlans])

  const recalculateAlerts = useCallback((waterfallId?: string) => {
    const targetId = waterfallId || currentWaterfallId
    const waterfall = waterfalls.find(w => w.id === targetId)
    if (!waterfall) return

    const level = getQualityForWaterfall(targetId)
    
    setAllAlerts(prev => {
      const acknowledgedMap: Record<string, boolean> = {}
      if (prev[targetId]) {
        prev[targetId].forEach(a => {
          acknowledgedMap[a.id] = a.acknowledged
        })
      }
      
      const newAlerts = generateAlertsForWaterfall(waterfall, level, routes).map(alert => ({
        ...alert,
        acknowledged: acknowledgedMap[alert.id] || false
      }))
      
      console.log('[AppContext] Alerts recalculated for', waterfall.name, ':', newAlerts.length, 'level:', level)
      
      return {
        ...prev,
        [targetId]: newAlerts
      }
    })
  }, [waterfalls, routes, currentWaterfallId, getQualityForWaterfall])

  const acknowledgeAlert = useCallback((waterfallId: string, alertId: string) => {
    setAllAlerts(prev => {
      const wfAlerts = prev[waterfallId] || []
      return {
        ...prev,
        [waterfallId]: wfAlerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
      }
    })
  }, [])

  const setCurrentWaterfall = useCallback((wf: WaterfallData | null) => {
    if (wf) {
      setCurrentWaterfallId(wf.id)
    }
  }, [])

  const addWaterfall = useCallback((wf: WaterfallData) => {
    setWaterfalls(prev => [...prev, wf])
    setCurrentWaterfallId(wf.id)
    setTimeout(() => {
      upsertRouteFromWaterfall(wf.id)
      recalculateAlerts(wf.id)
    }, 50)
  }, [upsertRouteFromWaterfall, recalculateAlerts])

  const updateWaterfall = useCallback((id: string, updates: Partial<WaterfallData>) => {
    setWaterfalls(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    setTimeout(() => {
      recalculateAlerts(id)
    }, 50)
  }, [recalculateAlerts])

  const setQualityData = useCallback((waterfallId: string, data: IceQualityData) => {
    setQualityDataState(prev => {
      const next = { ...prev, [waterfallId]: data }
      return next
    })
    
    setRoutes(prevRoutes => {
      const waterfall = waterfalls.find(w => w.id === waterfallId)
      if (!waterfall) return prevRoutes
      
      const plan = protectionPlans[waterfallId]
      const existing = prevRoutes.find(r => r.waterfallId === waterfallId)
      
      if (existing) {
        const updated: RouteRecord = {
          ...existing,
          qualityLevel: data.overallLevel,
          protectionPoints: plan?.totalPoints || existing.protectionPoints,
          qualityData: data,
          protectionPlan: plan || existing.protectionPlan,
          photoUrls: waterfall.photoUrl 
            ? [...new Set([...existing.photoUrls, waterfall.photoUrl])]
            : existing.photoUrls,
          lastUpdated: new Date().toISOString()
        }
        console.log('[AppContext] Route updated from quality:', updated.id, 'level:', updated.qualityLevel)
        return prevRoutes.map(r => r.id === existing.id ? updated : r)
      } else {
        const newRoute = generateRouteFromWaterfall(waterfall, data, plan)
        console.log('[AppContext] Route created from quality:', newRoute.id, 'level:', newRoute.qualityLevel)
        return [...prevRoutes, newRoute]
      }
    })
  }, [waterfalls, protectionPlans])

  const setProtectionPlan = useCallback((waterfallId: string, plan: ProtectionPlan) => {
    setProtectionPlansState(prev => ({ ...prev, [waterfallId]: plan }))
    
    setRoutes(prevRoutes => {
      const waterfall = waterfalls.find(w => w.id === waterfallId)
      if (!waterfall) return prevRoutes
      
      const quality = qualityData[waterfallId]
      const existing = prevRoutes.find(r => r.waterfallId === waterfallId)
      
      if (existing) {
        const updated: RouteRecord = {
          ...existing,
          qualityLevel: quality?.overallLevel || existing.qualityLevel,
          protectionPoints: plan.totalPoints,
          qualityData: quality || existing.qualityData,
          protectionPlan: plan,
          photoUrls: waterfall.photoUrl 
            ? [...new Set([...existing.photoUrls, waterfall.photoUrl])]
            : existing.photoUrls,
          lastUpdated: new Date().toISOString()
        }
        console.log('[AppContext] Route updated from plan:', updated.id, 'points:', updated.protectionPoints)
        return prevRoutes.map(r => r.id === existing.id ? updated : r)
      } else {
        const newRoute = generateRouteFromWaterfall(waterfall, quality, plan)
        console.log('[AppContext] Route created from plan:', newRoute.id, 'points:', newRoute.protectionPoints)
        return [...prevRoutes, newRoute]
      }
    })
  }, [waterfalls, qualityData])

  const addRoute = useCallback((route: RouteRecord) => {
    setRoutes(prev => [...prev, route])
  }, [])

  const updateRoute = useCallback((id: string, updates: Partial<RouteRecord>) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates, lastUpdated: new Date().toISOString() } : r))
  }, [])

  const setClimberWeightPersist = useCallback((weight: number) => {
    setClimberWeight(weight)
  }, [])

  useEffect(() => {
    if (currentWaterfall) {
      const existing = allAlerts[currentWaterfall.id]
      if (!existing || existing.length === 0) {
        recalculateAlerts(currentWaterfall.id)
      }
    }
  }, [currentWaterfall?.id])

  useEffect(() => {
    if (currentWaterfall && qualityData[currentWaterfall.id]) {
      console.log('[AppContext] Quality data changed, recalculating alerts')
      recalculateAlerts(currentWaterfall.id)
    }
  }, [qualityData[currentWaterfallId]?.overallLevel])

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
      currentAlerts,
      allAlerts,
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
