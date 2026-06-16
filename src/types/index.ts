export type IceQualityLevel = 'A' | 'B' | 'C' | 'D' | 'E'

export interface WaterfallData {
  id: string
  name: string
  location: string
  height: number
  angle: number
  temperature: number
  temperature24h: number
  temperature72h: number
  sunlightHours: number
  aspect: string
  photoUrl?: string
  createdAt: string
}

export interface IceQualityData {
  waterfallId: string
  colorType: 'transparent' | 'blue' | 'white' | 'milky' | 'brown'
  bubbleDensity: number
  hollowSound: 'none' | 'slight' | 'moderate' | 'severe'
  thickness: number
  brittleAreas: AreaMarker[]
  thinAreas: AreaMarker[]
  overallLevel: IceQualityLevel
  assessedAt: string
}

export interface AreaMarker {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  severity: 'low' | 'medium' | 'high'
}

export interface ProtectionPoint {
  id: string
  order: number
  height: number
  angle: number
  iceScrewLength: number
  depth: number
  fallFactor: number
  pullOutForce: number
  climberWeight: number
}

export interface ProtectionPlan {
  waterfallId: string
  totalPoints: number
  points: ProtectionPoint[]
  averageFallFactor: number
  maxFallDistance: number
  ropeStretch: number
  safetyMargin: number
  createdAt: string
}

export interface IceColumnRisk {
  id: string
  position: string
  rootConnection: 'strong' | 'medium' | 'weak' | 'detached'
  hangingIce: boolean
  size: 'small' | 'medium' | 'large'
  noStopZone: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface MeltingWindow {
  startTime: string
  endTime: string
  temperatureThreshold: number
  criticalAreas: string[]
}

export interface RouteRecord {
  id: string
  name: string
  waterfallId: string
  difficulty: string
  protectionPoints: number
  qualityLevel: IceQualityLevel
  temperatureRange: [number, number]
  photoUrls: string[]
  protectionPlan?: ProtectionPlan
  qualityData?: IceQualityData
  risks: IceColumnRisk[]
  createdAt: string
  lastUpdated: string
  notes: string
}

export interface TemperatureAlert {
  id: string
  type: 'rapid_rise' | 'melting_risk' | 'collapse_risk'
  severity: 'warning' | 'danger' | 'critical'
  message: string
  temperatureNow: number
  temperatureChange: number
  affectedRoutes: string[]
  timestamp: string
  acknowledged: boolean
}

export interface RouteCategory {
  id: string
  name: string
  temperatureRange: [number, number]
  qualityLevels: IceQualityLevel[]
  routeIds: string[]
  description: string
}
