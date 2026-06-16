import React, { useState } from 'react'
import { View, Text, Image, Button, Swiper, SwiperItem } from '@tarojs/components'
import classnames from 'classnames'
import { useAppContext } from '@/store/AppContext'
import SectionHeader from '@/components/SectionHeader'
import LevelBadge from '@/components/LevelBadge'
import DataCard from '@/components/DataCard'

import type { RouteRecord } from '@/types'
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
  const { routes, waterfalls } = useAppContext()
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null)

  const filteredRoutes = routes.filter(r => {
    if (activeFilter === 'all') return true
    if (['A', 'B', 'C'].includes(activeFilter)) {
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

  return (
    <View className={styles.routePage}>
      <View className='page-container'>
        <View className='page-header'>
          <Text className='page-title'>路线档案</Text>
          <Text className='page-subtitle'>共 {routes.length} 条攀冰线路档案</Text>
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
          </View>
        ) : (
          <View className={styles.routeList}>
            {filteredRoutes.map(route => (
              <View key={route.id} className={styles.routeCard} onClick={() => setSelectedRoute(route)}>
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
                  <View className={styles.photoCount}>📷 {route.photoUrls.length}张</View>
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
                    <Text className={styles.notes}>📝 {route.notes}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {selectedRoute && (
          <View className={styles.detailModal} onClick={() => setSelectedRoute(null)}>
            <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <View className={styles.modalHeader}>
                <Text className={styles.modalTitle}>{selectedRoute.name}</Text>
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
                    <View className={styles.photoSwiper} />
                  )}
                </View>

                <View className={styles.statsRow}>
                  <DataCard label='难度等级' value={selectedRoute.difficulty} size='small' color='primary' />
                  <DataCard label='冰质等级' value={selectedRoute.qualityLevel} size='small' />
                  <DataCard label='保护点数' value={selectedRoute.protectionPoints} size='small' />
                  <DataCard label='风险点' value={selectedRoute.risks.length} size='small' color={selectedRoute.risks.length > 0 ? 'warning' : 'success'} />
                </View>

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
                    <Text style={{ fontSize: '28rpx', color: '#546E7A', lineHeight: 1.6 }}>
                      {selectedRoute.notes}
                    </Text>
                  </View>
                )}

                {selectedRoute.risks.length > 0 && (
                  <View className={styles.detailSection}>
                    <Text className={styles.sectionTitle}>风险点标识</Text>
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
                            { { strong: '根部连接牢固', medium: '根部连接一般', weak: '根部连接较弱', detached: '根部已分离' }[risk.rootConnection]
                            {risk.hangingIce ? ' · 有悬挂冰' : ''}
                            {risk.noStopZone ? ' · ⚠️ 禁停区域' : ''}
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
