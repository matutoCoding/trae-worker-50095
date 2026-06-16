import React, { useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useAppContext } from '@/store/AppContext'
import SectionHeader from '@/components/SectionHeader'
import LevelBadge from '@/components/LevelBadge'
import { checkCollapseRisk, getIceQualityColor, calculateMeltingWindow } from '@/utils/calculations'
import type { TemperatureAlert, IceQualityLevel } from '@/types'
import styles from './index.module.scss'

const categories = [
  {
    id: 'cat-1',
    name: '极寒稳定区',
    temperatureRange: [-20, -10] as [number, number],
    qualityLevels: ['A', 'B'] as const,
    description: '气温极低，冰质坚硬稳定，适合各种难度线路攀爬',
    icon: '❄️'
  },
  {
    id: 'cat-2',
    name: '常规作业区',
    temperatureRange: [-10, 0] as [number, number],
    qualityLevels: ['B', 'C'] as const,
    description: '温度适中，冰质稳定，需注意午后升温影响',
    icon: '🏔️'
  },
  {
    id: 'cat-3',
    name: '清晨限定区',
    temperatureRange: [0, 3] as [number, number],
    qualityLevels: ['C'] as const,
    description: '接近冰点，仅清晨冰质可靠，10点后建议撤离',
    icon: '🌅'
  },
  {
    id: 'cat-4',
    name: '高危禁攀区',
    temperatureRange: [3, 20] as [number, number],
    qualityLevels: ['D', 'E'] as const,
    description: '温度过高，冰质不稳定，严禁任何攀爬活动',
    icon: '🚫'
  }
]

const WarningPage: React.FC = () => {
  const { 
    currentAlerts, 
    acknowledgeAlert, 
    currentWaterfall, 
    getCurrentQuality, 
    routes,
    getRouteForWaterfall
  } = useAppContext()

  const qualityLevel = currentWaterfall ? getCurrentQuality() : 'C'
  const currentRoute = currentWaterfall ? getRouteForWaterfall(currentWaterfall.id) : undefined

  const unacknowledgedCount = useMemo(() => 
    currentAlerts.filter(a => !a.acknowledged).length
  , [currentAlerts])

  const collapseRisk = useMemo(() => {
    if (!currentWaterfall) return null
    return checkCollapseRisk(
      currentWaterfall.temperature,
      currentWaterfall.temperature24h,
      currentWaterfall.temperature72h,
      qualityLevel
    )
  }, [currentWaterfall, qualityLevel])

  const meltWindow = useMemo(() => {
    if (!currentWaterfall) return null
    return calculateMeltingWindow(currentWaterfall.temperature, 7.5, 17.5)
  }, [currentWaterfall])

  const trendSummary = useMemo(() => {
    if (!currentWaterfall) return ''
    
    const tempRise24h = currentWaterfall.temperature - currentWaterfall.temperature24h
    const risk = collapseRisk?.risk || 'low'
    const levelLabels: Record<IceQualityLevel, string> = {
      A: '优质冰', B: '良好冰', C: '一般冰', D: '较差冰', E: '危险冰'
    }

    let canClimb = true
    let reason = ''

    if (qualityLevel === 'E') {
      canClimb = false
      reason = '冰质极差，严禁攀爬'
    } else if (qualityLevel === 'D') {
      canClimb = false
      reason = '冰质较差，需加密保护并严格控制人数'
    } else if (risk === 'critical' || risk === 'high') {
      canClimb = false
      reason = '崩塌风险过高，建议取消作业'
    } else if (currentWaterfall.temperature > 3) {
      canClimb = false
      reason = '温度过高，冰面融化风险大'
    } else if (currentWaterfall.temperature > 0 && meltWindow) {
      reason = `仅 ${String(Math.floor(meltWindow.startTime)).padStart(2, '0')}:{String(Math.round((meltWindow.startTime % 1) * 60)).padStart(2, '0')} 前可攀爬，午后冰面开始融化`
    } else if (tempRise24h > 5) {
      reason = `24h升温${tempRise24h.toFixed(1)}℃，冰质稳定性下降，建议缩短作业时间`
    } else if (unacknowledgedCount > 0) {
      reason = `存在${unacknowledgedCount}条未处理预警，建议确认后再安排作业`
    } else {
      reason = `${levelLabels[qualityLevel]} · 作业条件良好，可按标准流程带队`
    }

    return canClimb 
      ? `✅ 可带队 - ${reason}`
      : `⚠️ 谨慎作业 - ${reason}`
  }, [currentWaterfall, qualityLevel, collapseRisk, meltWindow, unacknowledgedCount])

  const currentWaterfallRoutes = useMemo(() => {
    if (!currentWaterfall) return []
    return routes.filter(r => r.waterfallId === currentWaterfall.id)
  }, [routes, currentWaterfall])

  const getRoutesInCategoryForCurrentWaterfall = (tempRange: [number, number]) => {
    return currentWaterfallRoutes.filter(r => 
      r.temperatureRange[0] >= tempRange[0] && r.temperatureRange[1] <= tempRange[1]
    )
  }

  const getAlertTypeInfo = (type: TemperatureAlert['type']) => {
    return {
      rapid_rise: { label: '气温骤升', dot: '#FF9800' },
      melting_risk: { label: '融化风险', dot: '#FF9800' },
      collapse_risk: { label: '崩塌风险', dot: '#F44336' }
    }[type]
  }

  const getSeverityClass = (severity: TemperatureAlert['severity']) => {
    return { warning: 'typeWarning', danger: 'typeDanger', critical: 'typeCritical' }[severity]
  }

  const getRouteName = (id: string) => {
    return routes.find(r => r.id === id)?.name || id
  }

  const handleAcknowledge = (alertId: string) => {
    if (!currentWaterfall) return
    acknowledgeAlert(currentWaterfall.id, alertId)
    Taro.showToast({ title: '已确认', icon: 'success' })
    console.log('[Warning] Alert acknowledged:', alertId)
  }

  const goToRouteDetail = (routeId: string) => {
    Taro.setStorageSync('pending_route_id', routeId)
    Taro.switchTab({ url: '/pages/route/index' })
  }

  const goToRouteWithFilter = () => {
    if (currentWaterfall) {
      Taro.setStorageSync('pending_waterfall_filter', currentWaterfall.id)
    }
    Taro.switchTab({ url: '/pages/route/index' })
  }

  return (
    <View className={styles.warningPage}>
      <View className='page-container'>
        <View className='page-header'>
          <Text className='page-title'>温度预警</Text>
          <Text className='page-subtitle'>
            {currentWaterfall ? `${currentWaterfall.name} · 实时监测` : '实时监测气温变化，预警崩塌风险'}
          </Text>
        </View>

        <View className={styles.alertHeader}>
          <View className={styles.headerTop}>
            <Text className={styles.title}>⚠️ 预警中心</Text>
            <View className={styles.count}>{unacknowledgedCount} 条未处理</View>
          </View>
          {currentWaterfall && (
            <>
              <View className={styles.tempNow}>
                <Text className={styles.tempValue}>{currentWaterfall.temperature}</Text>
                <Text className={styles.tempUnit}>℃ 当前气温</Text>
              </View>
              <View className={styles.tempTrend}>
                <View className={styles.trendItem}>
                  <Text className={styles.trendLabel}>24h变化</Text>
                  <Text className={classnames(styles.trendValue, currentWaterfall.temperature - currentWaterfall.temperature24h > 3 && styles.rise)}>
                    {currentWaterfall.temperature - currentWaterfall.temperature24h > 0 ? '↑' : '↓'} {Math.abs(currentWaterfall.temperature - currentWaterfall.temperature24h)}℃
                  </Text>
                </View>
                <View className={styles.trendItem}>
                  <Text className={styles.trendLabel}>72h变化</Text>
                  <Text className={classnames(styles.trendValue, currentWaterfall.temperature - currentWaterfall.temperature72h > 5 && styles.rise)}>
                    {currentWaterfall.temperature - currentWaterfall.temperature72h > 0 ? '↑' : '↓'} {Math.abs(currentWaterfall.temperature - currentWaterfall.temperature72h)}℃
                  </Text>
                </View>
                <View className={styles.trendItem}>
                  <Text className={styles.trendLabel}>冰质等级</Text>
                  <LevelBadge level={qualityLevel} size='small' showLabel={false} />
                </View>
              </View>
            </>
          )}
        </View>

        {currentWaterfall && (
          <View className={classnames(
            styles.trendSummary,
            trendSummary.startsWith('✅') ? styles.summarySuccess : styles.summaryWarning
          )}>
            <Text className={styles.summaryText}>{trendSummary}</Text>
            {currentRoute && meltWindow && (
              <View className={styles.summaryMeta}>
                <Text className={styles.metaItem}>冰质 {qualityLevel}级</Text>
                <Text className={styles.metaItem}>可攀时段 {String(Math.floor(meltWindow.startTime)).padStart(2, '0')}:{String(Math.round((meltWindow.startTime % 1) * 60)).padStart(2, '0')} - {String(Math.floor(meltWindow.endTime)).padStart(2, '0')}:{String(Math.round((meltWindow.endTime % 1) * 60)).padStart(2, '0')}</Text>
                <Text className={styles.metaItem}>{currentRoute.protectionPoints}个保护点</Text>
              </View>
            )}
          </View>
        )}

        {collapseRisk && collapseRisk.risk !== 'low' && currentWaterfall && (
          <View className={styles.collapseRisk}>
            <View className={styles.riskTitle}>
              <Text className={styles.riskIcon}>🚨</Text>
              <Text className={styles.riskText}>{collapseRisk.message}</Text>
            </View>
            <Text className={styles.riskMessage}>
              {currentWaterfall.name} 区域冰瀑稳定性评估结果。冰质等级 {qualityLevel} 级，温度变化可能导致冰层结构弱化，请注意观察冰壁状态变化。
            </Text>
            <View className={styles.riskFactors}>
              <View className={styles.factor}>
                <Text className={styles.factorLabel}>当前温度</Text>
                <Text className={styles.factorValue} style={{ color: currentWaterfall.temperature > 0 ? '#F44336' : '#26A69A' }}>
                  {currentWaterfall.temperature}℃
                </Text>
              </View>
              <View className={styles.factor}>
                <Text className={styles.factorLabel}>24h温升</Text>
                <Text className={styles.factorValue} style={{ color: currentWaterfall.temperature - currentWaterfall.temperature24h > 5 ? '#F44336' : '#1E88E5' }}>
                  +{currentWaterfall.temperature - currentWaterfall.temperature24h}℃
                </Text>
              </View>
              <View className={styles.factor}>
                <Text className={styles.factorLabel}>风险等级</Text>
                <Text className={styles.factorValue} style={{ color: { low: '#26A69A', medium: '#FF9800', high: '#F44336', critical: '#D32F2F' }[collapseRisk.risk] }}>
                  {{ low: '低', medium: '中', high: '高', critical: '极高' }[collapseRisk.risk]}
                </Text>
              </View>
            </View>
          </View>
        )}

        <SectionHeader title='预警信息' subtitle={`${currentAlerts.length} 条预警记录`} />
        <View className={styles.alertList}>
          {currentAlerts.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>当前冰瀑无预警，冰况稳定</Text>
            </View>
          ) : (
            currentAlerts.map(alert => {
              const typeInfo = getAlertTypeInfo(alert.type)
              return (
                <View
                  key={alert.id}
                  className={classnames(
                    styles.alertItem,
                    styles[getSeverityClass(alert.severity)],
                    alert.acknowledged && styles.acknowledged
                  )}
                >
                  <View className={styles.alertTop}>
                    <View className={styles.alertType}>
                      <View className={styles.alertDot} style={{ backgroundColor: typeInfo.dot }} />
                      <Text className={styles.alertTitle} style={{ color: typeInfo.dot }}>
                        {typeInfo.label}
                      </Text>
                    </View>
                    {!alert.acknowledged ? (
                      <Button className={styles.ackBtn} onClick={() => handleAcknowledge(alert.id)}>
                        确认
                      </Button>
                    ) : (
                      <Text className={styles.ackBtn}>已确认</Text>
                    )}
                  </View>
                  <Text className={styles.alertMessage}>{alert.message}</Text>
                  <View className={styles.alertFooter}>
                    <Text className={styles.alertMeta}>
                      🕐 {alert.timestamp.slice(11, 16)} · 当前 {alert.temperatureNow}℃ · 升温 {alert.temperatureChange}℃
                    </Text>
                    <View className={styles.affectedRoutes}>
                      {alert.affectedRoutes.slice(0, 2).map(rid => (
                        <Text 
                          key={rid} 
                          className={styles.routeTagClickable}
                          onClick={() => goToRouteDetail(rid)}
                        >
                          🔗 {getRouteName(rid)}
                        </Text>
                      ))}
                      {alert.affectedRoutes.length > 2 && (
                        <Text className={styles.routeTag}>+{alert.affectedRoutes.length - 2}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )
            })
          )}
        </View>

        <View className={styles.sectionHeaderRow}>
          <SectionHeader 
            title='温度分区' 
            subtitle={currentWaterfall ? `当前冰瀑 · ${currentWaterfallRoutes.length} 条线路` : '全部线路'} 
          />
          {currentWaterfall && (
            <Button className={styles.filterBtn} onClick={goToRouteWithFilter}>
              查看全部 →
            </Button>
          )}
        </View>
        <View className={styles.categorySection}>
          {categories.map(cat => {
            const catRoutes = getRoutesInCategoryForCurrentWaterfall(cat.temperatureRange)
            const isActive = currentRoute && 
              currentRoute.temperatureRange[0] >= cat.temperatureRange[0] && 
              currentRoute.temperatureRange[1] <= cat.temperatureRange[1]
            return (
              <View 
                key={cat.id} 
                className={classnames(styles.categoryCard, isActive && styles.activeCat)}
              >
                <View className={styles.categoryHeader}>
                  <View className={styles.categoryTitleRow}>
                    <Text className={styles.catIcon}>{cat.icon}</Text>
                    <Text className={styles.categoryName}>{cat.name}</Text>
                  </View>
                  <Text className={classnames(styles.routeCount, catRoutes.length > 0 && styles.highlightCount)}>
                    {catRoutes.length} 条
                  </Text>
                </View>
                <Text className={styles.tempRange}>
                  🌡️ 适用温度 {cat.temperatureRange[0]}℃ ~ {cat.temperatureRange[1]}℃
                </Text>
                <Text className={styles.categoryDesc}>{cat.description}</Text>
                <View className={styles.qualityLevels}>
                  {cat.qualityLevels.map(lvl => (
                    <Text
                      key={lvl}
                      className={styles.levelTag}
                      style={{
                        backgroundColor: `${getIceQualityColor(lvl)}20`,
                        color: getIceQualityColor(lvl)
                      }}
                    >
                      {lvl}级冰质
                    </Text>
                  ))}
                </View>
                {isActive && currentRoute && (
                  <View className={styles.currentInCat}>
                    <Text className={styles.currentLabel}>📍 当前线路</Text>
                    <Text 
                      className={styles.currentRouteName}
                      onClick={() => goToRouteDetail(currentRoute.id)}
                    >
                      {currentRoute.name} →
                    </Text>
                  </View>
                )}
                {!isActive && catRoutes.length > 0 && (
                  <View className={styles.catRoutes}>
                    {catRoutes.slice(0, 2).map(r => (
                      <Text 
                        key={r.id} 
                        className={styles.catRouteTagClickable}
                        onClick={() => goToRouteDetail(r.id)}
                      >
                        • {r.name} →
                      </Text>
                    ))}
                    {catRoutes.length > 2 && (
                      <Text className={styles.catRouteTag}>+{catRoutes.length - 2}条更多</Text>
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <SectionHeader title='安全操作指南' />
        <View className={styles.tipsCard}>
          <Text className={styles.tipsTitle}>🧊 攀冰温度安全守则</Text>
          <View className={styles.tipsList}>
            <View className={styles.tipItem}>
              <Text className={styles.tipIcon}>🌅</Text>
              <Text className={styles.tipText}>清晨是攀冰最佳时段，此时冰质最硬最稳定，保护点可靠性最高。</Text>
            </View>
            <View className={styles.tipItem}>
              <Text className={styles.tipIcon}>☀️</Text>
              <Text className={styles.tipText}>午后日照直射冰壁时注意观察融水迹象，出现明显流水时立即撤离。</Text>
            </View>
            <View className={styles.tipItem}>
              <Text className={styles.tipIcon}>🌡️</Text>
              <Text className={styles.tipText}>24小时内升温超过5℃时，冰壁稳定性急剧下降，应避免大角度线路。</Text>
            </View>
            <View className={styles.tipItem}>
              <Text className={styles.tipIcon}>📏</Text>
              <Text className={styles.tipText}>气温高于0℃时，每2小时重新评估一次冰质，保护点间距缩短30%。</Text>
            </View>
            <View className={styles.tipItem}>
              <Text className={styles.tipIcon}>🚨</Text>
              <Text className={styles.tipText}>发现冰壁出现连续空鼓声或大面积渗水时，立即停止作业全员撤离。</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default WarningPage
