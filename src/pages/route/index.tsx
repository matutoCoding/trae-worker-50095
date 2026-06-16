import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Image, Button, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useAppContext } from '@/store/AppContext'
import SectionHeader from '@/components/SectionHeader'
import LevelBadge from '@/components/LevelBadge'
import DataCard from '@/components/DataCard'
import { getIceQualityLabel } from '@/utils/calculations'

import type { RouteRecord, WaterfallData } from '@/types'
import styles from './index.module.scss'

const filterOptions = [
  { key: 'all', label: '全部线路' },
  { key: 'A', label: 'A级冰质' },
  { key: 'B', label: 'B级冰质' },
  { key: 'C', label: 'C级冰质' },
  { key: 'WI3', label: 'WI3难度' },
  { key: 'WI4', label: 'WI4难度' },
  { key: 'WI5+', label: 'WI5+' }
]

const RoutePage: React.FC = () => {
  const { routes, waterfalls, currentWaterfall, setCurrentWaterfall } = useAppContext()
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedWaterfallId, setSelectedWaterfallId] = useState<string>('')
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null)

  useEffect(() => {
    try {
      const pendingRouteId = Taro.getStorageSync('pending_route_id') as string
      const pendingWfFilter = Taro.getStorageSync('pending_waterfall_filter') as string
      
      if (pendingRouteId) {
        const found = routes.find(r => r.id === pendingRouteId)
        if (found) {
          setTimeout(() => {
            setSelectedRoute(found)
          }, 100)
          const wf = waterfalls.find(w => w.id === found.waterfallId)
          if (wf) {
            setCurrentWaterfall(wf)
            setSelectedWaterfallId(wf.id)
          }
        }
        Taro.removeStorageSync('pending_route_id')
      } else if (pendingWfFilter) {
        const wf = waterfalls.find(w => w.id === pendingWfFilter)
        if (wf) {
          setCurrentWaterfall(wf)
          setSelectedWaterfallId(wf.id)
        }
        Taro.removeStorageSync('pending_waterfall_filter')
      }
    } catch (e) {
      console.warn('Failed to read pending navigation data:', e)
    }
  }, [])

  const waterfallFilters: { key: string, label: string, wf?: WaterfallData }[] = useMemo(() => {
    const base = [{ key: '', label: '全部冰瀑' }]
    return [...base, ...waterfalls.map(w => ({ key: w.id, label: w.name, wf: w }))]
  }, [waterfalls])

  const filteredRoutes = routes.filter(r => {
    if (selectedWaterfallId && r.waterfallId !== selectedWaterfallId) return false
    if (activeFilter === 'all') return true
    if (['A', 'B', 'C', 'D', 'E'].includes(activeFilter)) {
      return r.qualityLevel === activeFilter
    }
    if (activeFilter === 'WI5+') {
      return r.difficulty.startsWith('WI5') || r.difficulty.startsWith('WI6') || r.difficulty.startsWith('WI7')
    }
    return r.difficulty === activeFilter
  })

  const getWaterfallName = (id: string) => {
    return waterfalls.find(w => w.id === id)?.name || '未知冰瀑'
  }

  const formatDateTime = (iso: string) => {
    try {
      return iso.slice(0, 16).replace(/-/g, '/').replace('T', ' ')
    } catch {
      return iso.slice(0, 10)
    }
  }

  return (
    <View className={styles.routePage}>
      <View className='page-container'>
        <View className='page-header'>
          <Text className='page-title'>路线档案</Text>
          <Text className='page-subtitle'>
            {selectedWaterfallId 
              ? `${getWaterfallName(selectedWaterfallId)} · ${filteredRoutes.length} 条线路` 
              : `共 ${routes.length} 条攀冰线路档案`}
          </Text>
        </View>

        <View className={styles.waterfallFilterBar}>
          {waterfallFilters.map(opt => (
            <Button
              key={opt.key || 'all-wf'}
              className={classnames(styles.wfFilterItem, selectedWaterfallId === opt.key && styles.activeWf)}
              onClick={() => {
                setSelectedWaterfallId(opt.key)
                if (opt.wf) setCurrentWaterfall(opt.wf)
              }}
            >
              {opt.label}
            </Button>
          ))}
        </View>

        <View className={styles.filterBar}>
          {filterOptions.map(opt => (
            <Button
            key={opt.key}
            className={classnames(styles.filterItem, activeFilter === opt.key && styles.active)}
            onClick={() => setActiveFilter(opt.key)}
          >
            {opt.label}
          </Button>
          ))}
        </View>

        <SectionHeader title={`线路列表`} subtitle={`${filteredRoutes.length} 条结果`} />

        {filteredRoutes.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无符合条件的线路</Text>
            <Text className={styles.emptyHint}>
              {selectedWaterfallId 
                ? `切换到「冰质评估」页先完成${getWaterfallName(selectedWaterfallId)}的冰质评估` 
                : '请先录入冰瀑并完成冰质评估'}
            </Text>
          </View>
        ) : (
          <View className={styles.routeList}>
            {filteredRoutes.map(route => {
              const isCurrent = currentWaterfall && route.waterfallId === currentWaterfall.id
              return (
                <View key={route.id} className={classnames(styles.routeCard, isCurrent && styles.currentCard)} onClick={() => setSelectedRoute(route)}>
                  <View className={styles.photoRow}>
                    {route.photoUrls.length > 0 ? (
                      <Image className={styles.photo} src={route.photoUrls[0]} mode='aspectFill' />
                    ) : (
                      <View className={styles.photo} />
                    )}
                    <View className={styles.difficultyBadge}>{route.difficulty}</View>
                    <View className={styles.qualityWrap}>
                      <LevelBadge level={route.qualityLevel} size='small' showLabel={false} />
                    </View>
                    {route.photoUrls.length > 0 && (
                      <View className={styles.photoCount}>📷 {route.photoUrls.length}张</View>
                    )}
                    {isCurrent && (
                      <View className={styles.currentBadge}>📍 当前</View>
                    )}
                  </View>
                  <View className={styles.info}>
                    <Text className={styles.routeName}>{route.name}</Text>
                    <Text className={styles.location}>📍 {getWaterfallName(route.waterfallId)}</Text>
                    <View className={styles.tempRange}>
                      <Text className={styles.tempText}>🌡️ 适用温度 {route.temperatureRange[0]}℃ ~ {route.temperatureRange[1]}℃</Text>
                    </View>
                    <View className={styles.meta}>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaText}>🧗 {route.protectionPoints}个保护点</Text>
                      </View>
                      <View className={styles.metaItem}>
                        <Text className={styles.metaText}>🕐 {route.lastUpdated.slice(0, 10).replace(/-/g, '/')}</Text>
                      </View>
                    </View>
                    {route.notes && (
                      <Text className={styles.notes}>📝 {route.notes.slice(0, 60)}{route.notes.length > 60 ? '...' : ''}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {selectedRoute && (
          <View className={styles.detailModal} onClick={() => setSelectedRoute(null)}>
            <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <View className={styles.modalHeader}>
                <View>
                  <Text className={styles.modalTitle}>{selectedRoute.name}</Text>
                  <Text className={styles.modalSubtitle}>📍 {getWaterfallName(selectedRoute.waterfallId)}</Text>
                </View>
                <Button className={styles.closeBtn} onClick={() => setSelectedRoute(null)}>×</Button>
              </View>
              <View className={styles.modalBody}>
                <View className={styles.detailPhotos}>
                  {selectedRoute.photoUrls.length > 0 ? (
                    <Swiper className={styles.photoSwiper} indicatorDots autoplay circular>
                      {selectedRoute.photoUrls.map((url, idx) => (
                        <SwiperItem key={idx}>
                          <Image className={styles.photo} src={url} mode='aspectFill' />
                        </SwiperItem>
                      ))}
                    </Swiper>
                  ) : (
                    <View className={styles.photoSwiper}>
                      <Text className={styles.noPhotoHint}>暂无冰况影像</Text>
                    </View>
                  )}
                </View>

                <View className={styles.statsRow}>
                  <DataCard label='难度等级' value={selectedRoute.difficulty} size='small' color='primary' />
                  <DataCard label='冰质等级' value={selectedRoute.qualityLevel} size='small' />
                  <DataCard label='保护点数' value={selectedRoute.protectionPoints} size='small' />
                  <DataCard label='风险点' value={selectedRoute.risks.length} size='small' color={selectedRoute.risks.length > 0 ? 'warning' : 'success'} />
                </View>

                {(selectedRoute.qualityData || selectedRoute.protectionPlan) && (
                  <View className={styles.detailSection}>
                    <Text className={styles.sectionTitle}>🧊 最近评估与打点摘要</Text>
                    
                    {selectedRoute.qualityData && (
                      <View className={styles.summaryCard}>
                        <Text className={styles.summaryHeader}>
                          <Text className={styles.summaryIcon}>❄️</Text>
                          冰质评估报告
                        </Text>
                        <View className={styles.summaryGrid}>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>冰质等级</Text>
                            <View className={styles.summaryValue}>
                              <LevelBadge level={selectedRoute.qualityData.overallLevel} size='small' />
                              <Text className={styles.summarySubText}>
                                {getIceQualityLabel(selectedRoute.qualityData.overallLevel)}
                              </Text>
                            </View>
                          </View>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>冰层颜色</Text>
                            <Text className={styles.summaryValueText}>
                              {{ transparent: '透明冰', blue: '蓝冰', white: '白冰', milky: '乳白冰', brown: '褐色冰' }[selectedRoute.qualityData.colorType]}
                            </Text>
                          </View>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>气泡密度</Text>
                            <Text className={styles.summaryValueText}>{selectedRoute.qualityData.bubbleDensity}%</Text>
                          </View>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>冰层厚度</Text>
                            <Text className={styles.summaryValueText}>{selectedRoute.qualityData.thickness}cm</Text>
                          </View>
                        </View>
                        <View className={styles.summaryFooter}>
                          <Text className={styles.summaryMeta}>
                            空鼓声：{{ none: '无', slight: '轻微', moderate: '中度', severe: '严重' }[selectedRoute.qualityData.hollowSound]}
                          </Text>
                          <Text className={styles.summaryMeta}>
                            评估时间：{formatDateTime(selectedRoute.qualityData.assessedAt)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedRoute.protectionPlan && (
                      <View className={styles.summaryCard}>
                        <Text className={styles.summaryHeader}>
                          <Text className={styles.summaryIcon}>🧗</Text>
                          保护打点方案
                        </Text>
                        <View className={styles.summaryGrid}>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>保护点数</Text>
                            <Text className={styles.summaryValueText} style={{ color: '#1E88E5', fontWeight: 'bold' }}>
                              {selectedRoute.protectionPlan.totalPoints} 个
                            </Text>
                          </View>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>平均坠落系数</Text>
                            <Text className={styles.summaryValueText}>{selectedRoute.protectionPlan.averageFallFactor.toFixed(2)}</Text>
                          </View>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>最大冲坠距离</Text>
                            <Text className={styles.summaryValueText}>{selectedRoute.protectionPlan.maxFallDistance.toFixed(1)}m</Text>
                          </View>
                          <View className={styles.summaryItem}>
                            <Text className={styles.summaryLabel}>绳索拉伸量</Text>
                            <Text className={styles.summaryValueText}>{selectedRoute.protectionPlan.ropeStretch.toFixed(1)}m</Text>
                          </View>
                        </View>
                        <View className={styles.summaryFooter}>
                          <Text className={styles.summaryMeta}>
                            安全余度：{selectedRoute.protectionPlan.safetyMargin >= 2 ? '✅ 充足' : selectedRoute.protectionPlan.safetyMargin >= 1.5 ? '⚠️ 一般' : '❌ 不足'}
                          </Text>
                          <Text className={styles.summaryMeta}>
                            生成时间：{formatDateTime(selectedRoute.protectionPlan.createdAt)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <View className={styles.detailSection}>
                  <Text className={styles.sectionTitle}>基础信息</Text>
                  <View className={styles.infoGrid}>
                    <DataCard label='所属冰瀑' value={getWaterfallName(selectedRoute.waterfallId)} size='small' />
                    <DataCard label='适用温度' value={`${selectedRoute.temperatureRange[0]}~${selectedRoute.temperatureRange[1]}℃`} size='small' />
                    <DataCard label='创建时间' value={selectedRoute.createdAt.slice(0, 10)} size='small' />
                    <DataCard label='更新时间' value={selectedRoute.lastUpdated.slice(0, 10)} size='small' />
                  </View>
                </View>

                {selectedRoute.notes && (
                  <View className={styles.detailSection}>
                    <Text className={styles.sectionTitle}>向导备注</Text>
                    <Text className={styles.notesContent}>
                      {selectedRoute.notes}
                    </Text>
                  </View>
                )}

                {selectedRoute.risks.length > 0 && (
                  <View className={styles.detailSection}>
                    <Text className={styles.sectionTitle}>风险点标识 ({selectedRoute.risks.length})</Text>
                    <View className={styles.riskList}>
                      {selectedRoute.risks.map(risk => (
                        <View key={risk.id} className={styles.riskItem}>
                          <View className={styles.riskHeader}>
                            <Text className={styles.riskPos}>📍 {risk.position}</Text>
                            <Text className={classnames(styles.riskLevel, styles[risk.riskLevel])}>
                              {{ low: '低风险', medium: '中风险', high: '高风险' }[risk.riskLevel]}
                            </Text>
                          </View>
                          <Text className={styles.riskDesc}>
                            {`${{ strong: '根部连接牢固', medium: '根部连接一般', weak: '根部连接较弱', detached: '根部已分离' }[risk.rootConnection]}${risk.hangingIce ? ' · 有悬挂冰' : ''}${risk.noStopZone ? ' · ⚠️ 禁停区域' : ''}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

export default RoutePage
