import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Slider, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useAppContext } from '@/store/AppContext'
import SectionHeader from '@/components/SectionHeader'
import DataCard from '@/components/DataCard'
import WarningAlert from '@/components/WarningAlert'
import LevelBadge from '@/components/LevelBadge'
import { generateProtectionPlan, calculateMeltingWindow, calculatePointSpacing } from '@/utils/calculations'
import type { ProtectionPlan, IceColumnRisk } from '@/types'
import styles from './index.module.scss'

const ProtectionPage: React.FC = () => {
  const { currentWaterfall, climberWeight, setClimberWeight, protectionPlans, setProtectionPlan, getCurrentQuality, qualityData } = useAppContext()

  const qualityLevel = currentWaterfall ? getCurrentQuality() : 'C'
  const [plan, setPlan] = useState<ProtectionPlan | null>(null)

  const risks = useMemo((): IceColumnRisk[] => {
    if (!currentWaterfall) return []
    const q = qualityData[currentWaterfall.id]
    if (!q) return []
    
    const result: IceColumnRisk[] = []
    
    if (q.brittleAreas && q.brittleAreas.length > 0) {
      q.brittleAreas.forEach((area, idx) => {
        result.push({
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
    
    if (q.thinAreas && q.thinAreas.length > 0) {
      q.thinAreas.forEach((area, idx) => {
        result.push({
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
    
    return result
  }, [currentWaterfall, qualityData])

  const meltWindow = useMemo(() => {
    if (!currentWaterfall) return null
    return calculateMeltingWindow(currentWaterfall.temperature, 7.5, 17.5)
  }, [currentWaterfall])

  useEffect(() => {
    if (currentWaterfall) {
      const existing = protectionPlans[currentWaterfall.id]
      if (existing) {
        setPlan(existing)
      } else {
        const newPlan = generateProtectionPlan(currentWaterfall, qualityLevel, climberWeight)
        setPlan(newPlan)
      }
    }
  }, [currentWaterfall?.id, qualityLevel, climberWeight])

  const handleWeightChange = (value: number) => {
    setClimberWeight(value)
    if (currentWaterfall) {
      const newPlan = generateProtectionPlan(currentWaterfall, qualityLevel, value)
      setPlan(newPlan)
    }
  }

  const handleRegenerate = () => {
    if (!currentWaterfall) return
    const newPlan = generateProtectionPlan(currentWaterfall, qualityLevel, climberWeight)
    setPlan(newPlan)
    Taro.showToast({ title: '保护方案已更新', icon: 'success' })
    console.log('[Protection] Plan regenerated for:', currentWaterfall.id, 'weight:', climberWeight)
  }

  const handleSave = () => {
    if (!currentWaterfall || !plan) return
    setProtectionPlan(currentWaterfall.id, plan)
    Taro.showToast({ title: '保护方案已保存', icon: 'success' })
  }

  const getFallFactorClass = (ff: number) => {
    if (ff <= 0.5) return 'safe'
    if (ff <= 1.0) return 'warn'
    return 'danger'
  }

  const getConnectionLabel = (c: IceColumnRisk['rootConnection']) => {
    return { strong: '连接牢固', medium: '连接一般', weak: '连接较弱', detached: '已分离' }[c]
  }

  const getSizeLabel = (s: IceColumnRisk['size']) => {
    return { small: '小型', medium: '中型', large: '大型' }[s]
  }

  if (!currentWaterfall) {
    return (
      <View className={styles.protectionPage}>
        <View className='page-container'>
          <View className={styles.noWaterfall}>
            <Text className={styles.icon}>🧗</Text>
            <Text className={styles.text}>请先在「冰瀑录入」页选择冰瀑</Text>
          </View>
        </View>
      </View>
    )
  }

  const spacing = calculatePointSpacing(qualityLevel, currentWaterfall.angle)

  return (
    <View className={styles.protectionPage}>
      <View className='page-container'>
        <View className='page-header'>
          <Text className='page-title'>保护打点</Text>
          <Text className='page-subtitle'>{currentWaterfall.name} · 保护方案智能规划</Text>
        </View>

        <View className='card'>
          <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16rpx' }}>
            <View>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: '#1A237E' }}>当前冰质</Text>
            </View>
            <LevelBadge level={qualityLevel} size='small' showLabel />
          </View>
          <View className={styles.weightRow}>
            <Text className={styles.label}>攀爬者体重</Text>
            <Text className={styles.value}>{climberWeight}<Text className={styles.unit}>kg</Text></Text>
          </View>
          <View className={styles.weightSlider}>
            <Slider
              min={40}
              max={120}
              step={1}
              value={climberWeight}
              activeColor='#1E88E5'
              backgroundColor='#CFD8DC'
              blockSize={24}
              onChange={(e) => handleWeightChange(e.detail.value)}
            />
          </View>
        </View>

        <SectionHeader title='安全指标概览' />
        <View className={styles.statsGrid}>
          {plan && (
            <>
              <DataCard
                label='平均坠落系数'
                value={plan.averageFallFactor}
                color={plan.averageFallFactor <= 0.5 ? 'success' : plan.averageFallFactor <= 1.0 ? 'warning' : 'danger'}
                size='small'
              />
              <DataCard
                label='最大冲坠距离'
                value={plan.maxFallDistance}
                unit='m'
                color={plan.maxFallDistance <= 6 ? 'success' : plan.maxFallDistance <= 10 ? 'warning' : 'danger'}
                size='small'
              />
              <DataCard
                label='绳索拉伸量'
                value={plan.ropeStretch}
                unit='m'
                color='primary'
                size='small'
              />
              <DataCard
                label='抗拔力余度'
                value={plan.safetyMargin > 0 ? `+${Math.round(plan.safetyMargin * 100)}` : Math.round(plan.safetyMargin * 100)}
                unit='%'
                color={plan.safetyMargin >= 0.5 ? 'success' : plan.safetyMargin >= 0 ? 'warning' : 'danger'}
                size='small'
              />
              <DataCard label='保护点总数' value={plan.totalPoints} size='small' color='primary' />
              <DataCard label='推荐间距' value={spacing} unit='m' size='small' />
            </>
          )}
        </View>

        {plan && plan.safetyMargin < 0 && (
          <WarningAlert
            type='danger'
            title='抗拔力不足'
            message='当前冰质条件下冰锥抗拔力余度为负，建议更换更长冰锥或加密保护点间距'
          />
        )}

        <View className={styles.sectionHint}>
          💡 坠落系数 ≤ 0.5 为优秀，0.5-1.0 为可接受，超过 1.0 存在受伤风险。抗拔力余度建议 ≥ 50%。
        </View>

        <SectionHeader title='午后融化时间窗' subtitle='日照升温后冰幕可能失效的时间段' />
        {meltWindow && (
          <View className={styles.meltWindow}>
            <View className={styles.windowHeader}>
              <Text className={styles.windowTitle}>今日攀爬安全时段</Text>
              <Text className={styles.windowIcon}>☀️</Text>
            </View>
            <Text style={{ fontSize: '24rpx', color: '#546E7A', marginBottom: '8rpx' }}>
              当前气温 {currentWaterfall.temperature}℃，预计午后升至 {Math.max(0, currentWaterfall.temperature + 4)}℃
            </Text>
            <View className={styles.timeBar}>
              <View className={styles.safeZone} style={{ width: `${(meltWindow.startTime / 24) * 100}%` }} />
              <View className={styles.dangerZone} style={{ left: `${(meltWindow.startTime / 24) * 100}%`, width: `${((meltWindow.endTime - meltWindow.startTime) / 24) * 100}%` }} />
              <View className={styles.dangerZone} style={{ left: `${(meltWindow.endTime / 24) * 100}%`, width: `${((24 - meltWindow.endTime) / 24) * 100}%`, background: 'linear-gradient(90deg, #4CAF50 0%, #26A69A 100%)' }} />
              <View className={styles.nowMarker} style={{ left: `${(10 / 24) * 100}%` }} />
            </View>
            <View className={styles.timeLabels}>
              <Text>00:00</Text>
              <Text>{String(Math.floor(meltWindow.startTime)).padStart(2, '0')}:{String(Math.round((meltWindow.startTime % 1) * 60)).padStart(2, '0')}</Text>
              <Text>{String(Math.floor(meltWindow.endTime)).padStart(2, '0')}:{String(Math.round((meltWindow.endTime % 1) * 60)).padStart(2, '0')}</Text>
              <Text>24:00</Text>
            </View>
            <View className={styles.windowStats}>
              <View className={styles.stat}>
                <Text className={styles.statValue}>{String(Math.floor(meltWindow.startTime)).padStart(2, '0')}:{String(Math.round((meltWindow.startTime % 1) * 60)).padStart(2, '0')}</Text>
                <Text className={styles.statLabel}>融化开始</Text>
              </View>
              <View className={styles.stat}>
                <Text className={styles.statValue}>{meltWindow.duration}h</Text>
                <Text className={styles.statLabel}>危险时段</Text>
              </View>
              <View className={styles.stat}>
                <Text className={styles.statValue}>{String(Math.floor(meltWindow.endTime)).padStart(2, '0')}:{String(Math.round((meltWindow.endTime % 1) * 60)).padStart(2, '0')}</Text>
                <Text className={styles.statLabel}>恢复稳定</Text>
              </View>
            </View>
          </View>
        )}

        <SectionHeader title='冰柱风险与禁停区' subtitle='识别冰柱根部连接与悬挂冰脱落风险' />
        <View className={styles.riskSection}>
          {risks.length === 0 ? (
            <View className={styles.emptyHint}>
              <Text className={styles.emptyHintIcon}>✅</Text>
              <Text className={styles.emptyHintText}>暂无风险标记，建议先完成冰质评估</Text>
            </View>
          ) : (
            risks.map(risk => (
            <View key={risk.id} className={classnames(styles.riskItem, styles[`risk${risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1)}`])}>
              <View className={styles.riskHeader}>
                <Text className={styles.riskPos}>📍 {risk.position}</Text>
                <Text className={classnames(styles.riskLevel, styles[risk.riskLevel])}>
                  {{ low: '低风险', medium: '中风险', high: '高风险' }[risk.riskLevel]}
                </Text>
              </View>
              <View className={styles.riskDetails}>
                <Text className={styles.tag}>{getConnectionLabel(risk.rootConnection)}</Text>
                <Text className={styles.tag}>{getSizeLabel(risk.size)}</Text>
                {risk.hangingIce && <Text className={styles.tag}>有悬挂冰</Text>}
                {risk.noStopZone && <Text className={classnames(styles.tag, styles.noStop)}>⚠️ 禁停区域</Text>}
              </View>
            </View>
          ))
        )}
        </View>

        <SectionHeader title='保护点布置详情' subtitle='按高度由低到高依次设置保护点' />
        {plan && (
          <View className={styles.timeline}>
            {plan.points.map((point, idx) => (
              <View key={point.id} className={styles.pointItem}>
                <View className={styles.pointHeader}>
                  <View className={styles.pointOrder}>
                    <View className={styles.orderBadge}>{point.order}</View>
                    <Text className={styles.pointHeight}>高度 {point.height}m</Text>
                  </View>
                  <Text className={classnames(styles.fallFactor, styles[getFallFactorClass(point.fallFactor)])}>
                    FF {point.fallFactor}
                  </Text>
                </View>
                <View className={styles.pointDetails}>
                  <View className={styles.detail}>
                    <Text className={styles.detailLabel}>置入角度</Text>
                    <Text className={styles.detailValue}>{point.angle}<Text className={styles.unit}>°</Text></Text>
                  </View>
                  <View className={styles.detail}>
                    <Text className={styles.detailLabel}>冰锥/深度</Text>
                    <Text className={styles.detailValue}>{point.iceScrewLength}/{point.depth}<Text className={styles.unit}>cm</Text></Text>
                  </View>
                  <View className={styles.detail}>
                    <Text className={styles.detailLabel}>抗拔力</Text>
                    <Text className={styles.detailValue}>{point.pullOutForce}<Text className={styles.unit}>kN</Text></Text>
                  </View>
                </View>
                {idx === 0 && (
                  <View style={{ marginTop: '16rpx', padding: '12rpx 16rpx', background: 'rgba(38, 166, 154, 0.1)', borderRadius: '8rpx' }}>
                    <Text style={{ fontSize: '22rpx', color: '#26A69A' }}>✅ 首个保护点，建议使用双冰锥备份</Text>
                  </View>
                )}
                {idx === plan.points.length - 1 && (
                  <View style={{ marginTop: '16rpx', padding: '12rpx 16rpx', background: 'rgba(30, 136, 229, 0.1)', borderRadius: '8rpx' }}>
                    <Text style={{ fontSize: '22rpx', color: '#1E88E5' }}>🏁 顶点保护站，建议设置锚点系统</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <Button className={styles.generateButton} onClick={handleRegenerate}>
          🔄 重新计算保护方案
        </Button>
        <Button className={styles.saveButton} onClick={handleSave}>
          💾 保存保护打点方案
        </Button>
      </View>
    </View>
  )
}

export default ProtectionPage
