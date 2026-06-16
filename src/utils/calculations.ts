import type { IceQualityLevel, IceQualityData, ProtectionPoint, ProtectionPlan, WaterfallData } from '@/types'

export const calculateIceQualityLevel = (data: {
  colorType: IceQualityData['colorType']
  bubbleDensity: number
  hollowSound: IceQualityData['hollowSound']
  thickness: number
}): IceQualityLevel => {
  let score = 0

  const colorScores: Record<IceQualityData['colorType'], number> = {
    transparent: 5,
    blue: 4,
    white: 3,
    milky: 2,
    brown: 1
  }
  score += colorScores[data.colorType] || 0

  if (data.bubbleDensity <= 10) score += 5
  else if (data.bubbleDensity <= 30) score += 4
  else if (data.bubbleDensity <= 50) score += 3
  else if (data.bubbleDensity <= 70) score += 2
  else score += 1

  const hollowScores: Record<IceQualityData['hollowSound'], number> = {
    none: 5,
    slight: 4,
    moderate: 2,
    severe: 0
  }
  score += hollowScores[data.hollowSound] || 0

  if (data.thickness >= 20) score += 5
  else if (data.thickness >= 15) score += 4
  else if (data.thickness >= 10) score += 3
  else if (data.thickness >= 5) score += 2
  else score += 1

  const avgScore = score / 4
  if (avgScore >= 4.5) return 'A'
  if (avgScore >= 3.5) return 'B'
  if (avgScore >= 2.5) return 'C'
  if (avgScore >= 1.5) return 'D'
  return 'E'
}

export const calculateFallFactor = (fallDistance: number, ropeLength: number): number => {
  if (ropeLength <= 0) return 2
  return Math.min(fallDistance / ropeLength, 2)
}

export const calculateOptimalScrewAngle = (iceAngle: number): number => {
  return Math.max(45, Math.min(90, iceAngle + 15))
}

export const calculatePointSpacing = (
  iceQuality: IceQualityLevel,
  waterfallAngle: number
): number => {
  const baseSpacing = {
    A: 5,
    B: 4,
    C: 3,
    D: 2.5,
    E: 2
  }
  const angleFactor = waterfallAngle > 80 ? 0.8 : waterfallAngle > 60 ? 0.9 : 1
  return Math.round(baseSpacing[iceQuality] * angleFactor * 10) / 10
}

export const calculatePullOutForce = (
  screwLength: number,
  iceDepth: number,
  iceQuality: IceQualityLevel,
  climberWeight: number
): { force: number; margin: number } => {
  const qualityFactor = {
    A: 1.2,
    B: 1.0,
    C: 0.8,
    D: 0.6,
    E: 0.4
  }
  const effectiveLength = Math.min(iceDepth, screwLength)
  const force = effectiveLength * 2.5 * qualityFactor[iceQuality]
  const requiredForce = climberWeight * 9.8 * 2
  const margin = (force - requiredForce) / requiredForce
  return { force: Math.round(force * 10) / 10, margin: Math.round(margin * 100) / 100 }
}

export const calculateRopeStretch = (
  fallFactor: number,
  climberWeight: number,
  ropeLength: number
): number => {
  const staticStretch = 0.05
  const dynamicFactor = fallFactor * 0.08
  const weightFactor = (climberWeight - 60) * 0.001
  return Math.round(ropeLength * (staticStretch + dynamicFactor + Math.max(0, weightFactor)) * 100) / 100
}

export const calculateMeltingWindow = (
  currentTemp: number,
  sunriseHour: number,
  sunsetHour: number
): { startTime: number; endTime: number; duration: number } => {
  const criticalTemp = 0
  let startHour: number
  let endHour: number

  if (currentTemp >= criticalTemp) {
    startHour = Math.max(sunriseHour, 6)
    endHour = Math.min(sunsetHour, 18)
  } else {
    const tempRise = Math.abs(currentTemp) * 0.8
    startHour = sunriseHour + tempRise
    endHour = sunsetHour - tempRise * 0.5
  }

  return {
    startTime: Math.round(startHour * 10) / 10,
    endTime: Math.round(endHour * 10) / 10,
    duration: Math.round((endHour - startHour) * 10) / 10
  }
}

export const checkCollapseRisk = (
  tempNow: number,
  temp24h: number,
  temp72h: number,
  iceQuality: IceQualityLevel
): { risk: 'low' | 'medium' | 'high' | 'critical'; message: string } => {
  const tempRise24h = tempNow - temp24h
  const tempRise72h = tempNow - temp72h
  let riskScore = 0

  if (tempNow > 2) riskScore += 2
  else if (tempNow > 0) riskScore += 1

  if (tempRise24h > 8) riskScore += 3
  else if (tempRise24h > 5) riskScore += 2
  else if (tempRise24h > 3) riskScore += 1

  if (tempRise72h > 12) riskScore += 2
  else if (tempRise72h > 8) riskScore += 1

  if (iceQuality === 'D') riskScore += 1
  if (iceQuality === 'E') riskScore += 2

  if (riskScore >= 6) return { risk: 'critical', message: '极高崩塌风险，立即撤离！' }
  if (riskScore >= 4) return { risk: 'high', message: '高崩塌风险，谨慎作业' }
  if (riskScore >= 2) return { risk: 'medium', message: '中等风险，加强观察' }
  return { risk: 'low', message: '风险较低，注意常规防护' }
}

export const generateProtectionPlan = (
  waterfall: WaterfallData,
  iceQuality: IceQualityLevel,
  climberWeight: number
): ProtectionPlan => {
  const spacing = calculatePointSpacing(iceQuality, waterfall.angle)
  const totalPoints = Math.max(3, Math.floor(waterfall.height / spacing))
  const points: ProtectionPoint[] = []
  let totalFallFactor = 0

  for (let i = 0; i < totalPoints; i++) {
    const height = Math.round((waterfall.height / totalPoints) * (i + 1) * 10) / 10
    const angle = calculateOptimalScrewAngle(waterfall.angle)
    const screwLength = iceQuality === 'A' || iceQuality === 'B' ? 22 : 16
    const depth = iceQuality === 'A' || iceQuality === 'B' ? 20 : 14
    const ropeLength = height
    const fallDistance = spacing * 2
    const fallFactor = calculateFallFactor(fallDistance, ropeLength)
    const { force } = calculatePullOutForce(screwLength, depth, iceQuality, climberWeight)

    totalFallFactor += fallFactor

    points.push({
      id: `point-${i}`,
      order: i + 1,
      height,
      angle,
      iceScrewLength: screwLength,
      depth,
      fallFactor: Math.round(fallFactor * 100) / 100,
      pullOutForce: force,
      climberWeight
    })
  }

  const avgFallFactor = Math.round((totalFallFactor / totalPoints) * 100) / 100
  const maxFallDistance = spacing * 2
  const ropeStretch = calculateRopeStretch(avgFallFactor, climberWeight, waterfall.height)
  const { margin } = calculatePullOutForce(22, 20, iceQuality, climberWeight)

  return {
    waterfallId: waterfall.id,
    totalPoints,
    points,
    averageFallFactor: avgFallFactor,
    maxFallDistance: Math.round(maxFallDistance * 10) / 10,
    ropeStretch,
    safetyMargin: margin,
    createdAt: new Date().toISOString()
  }
}

export const getIceQualityLabel = (level: IceQualityLevel): string => {
  const labels: Record<IceQualityLevel, string> = {
    A: '优质冰 - 极稳定',
    B: '良好冰 - 稳定',
    C: '一般冰 - 需注意',
    D: '较差冰 - 高风险',
    E: '危险冰 - 禁止攀爬'
  }
  return labels[level]
}

export const getIceQualityColor = (level: IceQualityLevel): string => {
  const colors: Record<IceQualityLevel, string> = {
    A: '#4CAF50',
    B: '#8BC34A',
    C: '#FFC107',
    D: '#FF9800',
    E: '#F44336'
  }
  return colors[level]
}

export interface DispatchPlan {
  canDispatch: boolean
  reason: string
  startTime: number
  endTime: number
  maxClimbers: number
  needExtraProtection: boolean
  protectionSpacing: number
  safetyReminders: string[]
  riskLevel: 'safe' | 'caution' | 'danger' | 'forbidden'
}

export const calculateDispatchPlan = (
  tempNow: number,
  temp24h: number,
  temp72h: number,
  iceQuality: IceQualityLevel,
  waterfallHeight: number,
  sunlightHours: number,
  unacknowledgedAlerts: number,
  hasNoStopZone: boolean,
  protectionMargin: number
): DispatchPlan => {
  const tempRise24h = tempNow - temp24h
  const { risk: collapseRisk } = checkCollapseRisk(tempNow, temp24h, temp72h, iceQuality)
  const meltWindow = calculateMeltingWindow(tempNow, 7.5, 17.5)

  let canDispatch = true
  let riskLevel: DispatchPlan['riskLevel'] = 'safe'
  let reason = '作业条件良好'
  let maxClimbers = 6
  let needExtraProtection = false
  let protectionSpacing = 4
  const safetyReminders: string[] = []

  if (iceQuality === 'E') {
    canDispatch = false
    riskLevel = 'forbidden'
    reason = '冰质极差，严禁带队攀爬'
    maxClimbers = 0
  } else if (iceQuality === 'D') {
    canDispatch = false
    riskLevel = 'danger'
    reason = '冰质较差，不建议带队作业'
    maxClimbers = 0
  } else if (collapseRisk === 'critical') {
    canDispatch = false
    riskLevel = 'danger'
    reason = '崩塌风险极高，取消当日作业'
    maxClimbers = 0
  } else if (tempNow > 3) {
    canDispatch = false
    riskLevel = 'danger'
    reason = '气温过高，冰面融化风险大'
    maxClimbers = 0
  } else {
    if (iceQuality === 'C') {
      riskLevel = 'caution'
      maxClimbers = 4
      needExtraProtection = true
      protectionSpacing = 3
      safetyReminders.push('冰质一般，需加密保护点')
    } else if (iceQuality === 'B') {
      maxClimbers = 6
      protectionSpacing = 4
      safetyReminders.push('冰质良好，按标准间距布置保护')
    } else if (iceQuality === 'A') {
      maxClimbers = 8
      protectionSpacing = 5
      safetyReminders.push('冰质优秀，保护点间距可适当放宽')
    }

    if (collapseRisk === 'high') {
      riskLevel = 'caution'
      maxClimbers = Math.min(maxClimbers, 3)
      needExtraProtection = true
      safetyReminders.push('崩塌风险较高，严格控制人数')
      reason = '有一定风险，谨慎作业'
    }

    if (tempRise24h > 5) {
      riskLevel = 'caution'
      maxClimbers = Math.min(maxClimbers, 4)
      safetyReminders.push(`24h升温${tempRise24h.toFixed(1)}℃，注意冰质变化`)
    }

    if (tempNow > 0 && meltWindow) {
      riskLevel = 'caution'
      safetyReminders.push(`午后冰面将在${String(Math.floor(meltWindow.endTime)).padStart(2, '0')}:${String(Math.round((meltWindow.endTime % 1) * 60)).padStart(2, '0')}后开始融化`)
    }

    if (unacknowledgedAlerts > 0) {
      safetyReminders.push(`存在${unacknowledgedAlerts}条未确认预警，请先确认`)
    }

    if (hasNoStopZone) {
      safetyReminders.push('线路含禁停区域，攀登时禁止停留')
      needExtraProtection = true
    }

    if (protectionMargin < 1.5) {
      needExtraProtection = true
      safetyReminders.push('冰锥抗拔力余度不足，建议使用更长冰锥')
    }

    if (waterfallHeight > 80) {
      maxClimbers = Math.min(maxClimbers, 4)
      safetyReminders.push('冰瀑较高，建议分组攀爬')
    }

    if (sunlightHours > 6) {
      safetyReminders.push('日照时间较长，午后注意观察融水')
    }

    if (canDispatch && riskLevel === 'safe') {
      reason = '作业条件良好，可按计划带队'
    } else if (canDispatch && riskLevel === 'caution') {
      reason = '有一定风险，谨慎带队作业'
    }
  }

  return {
    canDispatch,
    reason,
    startTime: meltWindow?.startTime || 7.5,
    endTime: meltWindow?.endTime || 16.5,
    maxClimbers,
    needExtraProtection,
    protectionSpacing,
    safetyReminders,
    riskLevel
  }
}

export const generateDailyReport = (params: {
  waterfallName: string
  waterfallHeight: number
  waterfallAngle: number
  tempNow: number
  temp24h: number
  temp72h: number
  iceQuality: IceQualityLevel
  thickness: number
  bubbleDensity: number
  hollowSound: string
  protectionPoints: number
  safetyMargin: number
  unacknowledgedAlerts: number
  dispatchPlan: DispatchPlan
  routeName: string
}): string => {
  const now = new Date()
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  
  const hollowSoundLabels: Record<string, string> = {
    none: '无', slight: '轻微', moderate: '中度', severe: '严重'
  }

  const lines = [
    `【攀冰出队日报】${dateStr}`,
    '',
    `📍 冰瀑：${params.waterfallName}`,
    `📏 参数：高度${params.waterfallHeight}m · 倾角${params.waterfallAngle}°`,
    ``,
    `🌡️ 气温：当前${params.tempNow}℃ · 24h变温${params.tempNow - params.temp24h > 0 ? '+' : ''}${(params.tempNow - params.temp24h).toFixed(1)}℃ · 72h变温${params.tempNow - params.temp72h > 0 ? '+' : ''}${(params.tempNow - params.temp72h).toFixed(1)}℃`,
    ``,
    `❄️ 冰质评估：${params.iceQuality}级`,
    `   冰层厚度${params.thickness}cm · 气泡密度${params.bubbleDensity}% · 空鼓声${hollowSoundLabels[params.hollowSound] || params.hollowSound}`,
    ``,
    `🧗 保护方案：${params.protectionPoints}个保护点 · 抗拔力余度${params.safetyMargin.toFixed(2)}`,
    ``,
    `📋 出队决策：${params.dispatchPlan.canDispatch ? '✅ 可带队' : '❌ 建议取消'}`,
    `   ${params.dispatchPlan.reason}`,
    `   开攀时间：${String(Math.floor(params.dispatchPlan.startTime)).padStart(2, '0')}:${String(Math.round((params.dispatchPlan.startTime % 1) * 60)).padStart(2, '0')}`,
    `   撤离时间：${String(Math.floor(params.dispatchPlan.endTime)).padStart(2, '0')}:${String(Math.round((params.dispatchPlan.endTime % 1) * 60)).padStart(2, '0')}`,
    `   可带人数：${params.dispatchPlan.maxClimbers}人`,
    `   加密保护：${params.dispatchPlan.needExtraProtection ? '是' : '否'}`,
    ``,
    `线路：${params.routeName}`,
  ]

  if (params.dispatchPlan.safetyReminders.length > 0) {
    lines.push('')
    lines.push('⚠️ 安全提醒：')
    params.dispatchPlan.safetyReminders.forEach((r, i) => {
      lines.push(`   ${i + 1}. ${r}`)
    })
  }

  if (params.unacknowledgedAlerts > 0) {
    lines.push('')
    lines.push(`🚨 存在${params.unacknowledgedAlerts}条未确认预警，请先处理！`)
  }

  lines.push('')
  lines.push('—— 生成于攀冰安全规划系统')

  return lines.join('\n')
}
