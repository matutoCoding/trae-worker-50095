import React, { useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useAppContext } from '@/store/AppContext'
import SectionHeader from '@/components/SectionHeader'
import { checkCollapseRisk, getIceQualityColor } from '@/utils/calculations'
import type { TemperatureAlert } from '@/types'
import styles from './index.module.scss'

const categories = [
  {
    id: 'cat-1',
    name: '极寒稳定区',
    temperatureRange: [-20, -10] as [number, number],
    qualityLevels: ['A', 'B'] as const,
    description: '气温极低，冰质坚硬稳定，适合各种难度线路攀爬'
  },
  {
    id: 'cat-2',
    name: '常规作业区',
    temperatureRange: [-10, 0] as [number, number],
    qualityLevels: ['B', 'C'] as const,
    description: '温度适中，冰质稳定，需注意午后升温影响'
  },
  {
    id: 'cat-3',
    name: '清晨限定区',
    temperatureRange: [0, 3] as [number, number],
    qualityLevels: ['C'] as const,
    description: '接近冰点，仅清晨冰质可靠，10点后建议撤离'
  },
  {
    id: 'cat-4',
    name: '高危禁攀区',
    temperatureRange: [3, 20] as [number, number],
    qualityLevels: ['D', 'E'] as const,
    description: '温度过高，冰质不稳定，严禁任何攀爬活动'
  }
]

const WarningPage: React.FC = () => {
  const { 
    currentAlerts, 
    acknowledgeAlert, 
    currentWaterfall, 
    getCurrentQuality, 
    routes 
  } = useAppContext()

  const unacknowledgedCount = useMemo(() => 
    currentAlerts.filter(a => !a.acknowledged).length
  , [currentAlerts])

  const collapseRisk = useMemo(() => {
    if (!currentWaterfall) return null
    const quality = getCurrentQuality()
    return checkCollapseRisk(
      currentWaterfall.temperature,
      currentWaterfall.temperature24h,
      currentWaterfall.temperature72h,
      quality
    )
  }, [currentWaterfall, getCurrentQuality])

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

  const getRoutesInCategory = (tempRange: [number, number]) => {
    return routes.filter(r => 
      r.temperatureRange[0] >= tempRange[0] && r.temperatureRange[1] <= tempRange[1]
    )
  }

  const handleAcknowledge = (alertId: string) => {
    if (!currentWaterfall) return
    acknowledgeAlert(currentWaterfall.id, alertId)
    Taro.showToast({ title: '已确认', icon: 'success' })
    console.log('[Warning] Alert acknowledged:', alertId)
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
                  <Text className={styles.trendLabel}>日照时长</Text>
                  <Text className={styles.trendValue}>{currentWaterfall.sunlightHours}h</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {collapseRisk && collapseRisk.risk !== 'low' && currentWaterfall && (
          <View className={styles.collapseRisk}>
            <View className={styles.riskTitle}>
              <Text className={styles.riskIcon}>🚨</Text>
              <Text className={styles.riskText}>{collapseRisk.message}</Text>
            </View>
            <Text className={styles.riskMessage}>
              {currentWaterfall.name} 区域冰瀑稳定性评估结果。冰质等级 {getCurrentQuality()} 级，温度变化可能导致冰层结构弱化，请注意观察冰壁状态变化。
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
                        <Text key={rid} className={styles.routeTag}>{getRouteName(rid)}</Text>
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

        <SectionHeader title='温度分区' subtitle={`共 ${routes.length} 条线路入库`} />
        <View className={styles.categorySection}>
          {categories.map(cat => {
            const catRoutes = getRoutesInCategory(cat.temperatureRange)
            return (
              <View key={cat.id} className={styles.categoryCard}>
                <View className={styles.categoryHeader}>
                  <Text className={styles.categoryName}>{cat.name}</Text>
                  <Text className={styles.routeCount}>{catRoutes.length} 条线路</Text>
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
                {catRoutes.length > 0 && (
                  <View className={styles.catRoutes}>
                    {catRoutes.slice(0, 2).map(r => (
                      <Text key={r.id} className={styles.catRouteTag}>• {r.name}</Text>
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
