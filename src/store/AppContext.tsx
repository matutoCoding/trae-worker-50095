import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { WaterfallData, IceQualityData, ProtectionPlan, RouteRecord, TemperatureAlert, IceQualityLevel } from '@/types'
import { mockWaterfalls, mockRoutes, mockAlerts } from '@/data/mockData'

interface AppContextType {
  waterfalls: WaterfallData[]
  currentWaterfall: WaterfallData | null
  setCurrentWaterfall: (wf: WaterfallData | null) => void
  addWaterfall: (wf: WaterfallData) => void

  qualityData: Record<string, IceQualityData>
  setQualityData: (waterfallId: string, data: IceQualityData) => void

  protectionPlans: Record<string, ProtectionPlan>
  setProtectionPlan: (waterfallId: string, plan: ProtectionPlan) => void

  routes: RouteRecord[]
  addRoute: (route: RouteRecord) => void
  updateRoute: (id: string, route: Partial<RouteRecord>) => void

  alerts: TemperatureAlert[]
  acknowledgeAlert: (id: string) => void

  climberWeight: number
  setClimberWeight: (weight: number) => void

  getCurrentQuality: () => IceQualityLevel
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waterfalls, setWaterfalls] = useState<WaterfallData[]>(mockWaterfalls)
  const [currentWaterfall, setCurrentWaterfall] = useState<WaterfallData | null>(mockWaterfalls[0])
  const [qualityData, setQualityDataState] = useState<Record<string, IceQualityData>>({})
  const [protectionPlans, setProtectionPlansState] = useState<Record<string, ProtectionPlan>>({})
  const [routes, setRoutes] = useState<RouteRecord[]>(mockRoutes)
  const [alerts, setAlerts] = useState<TemperatureAlert[]>(mockAlerts)
  const [climberWeight, setClimberWeight] = useState<number>(70)

  const addWaterfall = useCallback((wf: WaterfallData) => {
    setWaterfalls(prev => [...prev, wf])
    setCurrentWaterfall(wf)
  }, [])

  const setQualityData = useCallback((waterfallId: string, data: IceQualityData) => {
    setQualityDataState(prev => ({ ...prev, [waterfallId]: data }))
  }, [])

  const setProtectionPlan = useCallback((waterfallId: string, plan: ProtectionPlan) => {
    setProtectionPlansState(prev => ({ ...prev, [waterfallId]: plan }))
  }, [])

  const addRoute = useCallback((route: RouteRecord) => {
    setRoutes(prev => [...prev, route])
  }, [])

  const updateRoute = useCallback((id: string, updates: Partial<RouteRecord>) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates, lastUpdated: new Date().toISOString() } : r))
  }, [])

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }, [])

  const getCurrentQuality = useCallback((): IceQualityLevel => {
    if (!currentWaterfall) return 'C'
    const route = routes.find(r => r.waterfallId === currentWaterfall.id)
    return route?.qualityLevel || 'C'
  }, [currentWaterfall, routes])

  return (
    <AppContext.Provider value={{
      waterfalls,
      currentWaterfall,
      setCurrentWaterfall,
      addWaterfall,
      qualityData,
      setQualityData,
      protectionPlans,
      setProtectionPlan,
      routes,
      addRoute,
      updateRoute,
      alerts,
      acknowledgeAlert,
      climberWeight,
      setClimberWeight,
      getCurrentQuality
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
