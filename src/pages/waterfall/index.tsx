import React, { useState } from 'react'
import { View, Text, Image, Input, Slider, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useAppContext } from '@/store/AppContext'
import DataCard from '@/components/DataCard'
import SectionHeader from '@/components/SectionHeader'
import LevelBadge from '@/components/LevelBadge'
import { aspectOptions } from '@/data/mockData'
import type { WaterfallData } from '@/types'
import styles from './index.module.scss'

const WaterfallPage: React.FC = () => {
  const { waterfalls, currentWaterfall, setCurrentWaterfall, addWaterfall, getCurrentQuality, upsertRouteFromWaterfall } = useAppContext()

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    height: 50,
    angle: 75,
    temperature: -5,
    temperature24h: -10,
    temperature72h: -15,
    sunlightHours: 5,
    aspect: '北'
  })

  const handleSelectWaterfall = (wf: WaterfallData) => {
    setCurrentWaterfall(wf)
    Taro.showToast({ title: `已切换：${wf.name}`, icon: 'none' })
  }

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.location.trim()) {
      Taro.showToast({ title: '请填写名称和位置', icon: 'none' })
      return
    }

    const newWaterfall: WaterfallData = {
      id: `wf-${Date.now()}`,
      ...formData,
      createdAt: new Date().toISOString()
    }

    addWaterfall(newWaterfall)
    setShowForm(false)
    setFormData({
      name: '',
      location: '',
      height: 50,
      angle: 75,
      temperature: -5,
      temperature24h: -10,
      temperature72h: -15,
      sunlightHours: 5,
      aspect: '北'
    })
    setTimeout(() => {
      upsertRouteFromWaterfall(newWaterfall.id)
    }, 100)
    Taro.showToast({ title: '冰瀑录入成功', icon: 'success' })
    console.log('[Waterfall] New waterfall created:', newWaterfall.id)
  }

  const qualityLevel = currentWaterfall ? getCurrentQuality() : 'C'

  return (
    <View className={styles.waterfallPage}>
      <View className='page-container'>
        <View className='page-header'>
          <Text className='page-title'>冰瀑录入</Text>
          <Text className='page-subtitle'>选择或录入冰瀑基础数据，开启安全评估</Text>
        </View>

        <SectionHeader title='冰瀑列表' subtitle='点击切换当前工作冰瀑' />
        <ScrollView scrollX className={styles.waterfallList}>
          {waterfalls.map(wf => (
            <View
              key={wf.id}
              className={classnames(styles.waterfallCard, currentWaterfall?.id === wf.id && styles.active)}
              onClick={() => handleSelectWaterfall(wf)}
            >
              {wf.photoUrl ? (
                <Image className={styles.photo} src={wf.photoUrl} mode='aspectFill' />
              ) : (
                <View className={styles.photo} />
              )}
              <View className={styles.info}>
                <Text className={styles.name}>{wf.name}</Text>
                <Text className={styles.location}>{wf.location}</Text>
                <View className={styles.stats}>
                  <Text className={styles.stat}>{wf.height}m</Text>
                  <Text className={styles.stat}>{wf.angle}°</Text>
                  <Text className={styles.stat}>{wf.temperature}℃</Text>
                </View>
              </View>
            </View>
          ))}
          <View className={styles.addCard} onClick={() => setShowForm(true)}>
            <Text className={styles.addIcon}>+</Text>
            <Text className={styles.addText}>录入新冰瀑</Text>
          </View>
        </ScrollView>

        {currentWaterfall ? (
          <>
            <SectionHeader title='当前冰瀑概览' />
            <View className={styles.currentCard}>
              {currentWaterfall.photoUrl ? (
                <View className={styles.photo}>
                  <Image
                    className={styles.photo}
                    src={currentWaterfall.photoUrl}
                    mode='aspectFill'
                    onError={(e) => console.error('[Waterfall] Image load failed:', e)}
                  />
                  <View className={styles.levelBadgeWrap}>
                    <LevelBadge level={qualityLevel} size='small' />
                  </View>
                </View>
              ) : (
                <View className={styles.photo}>
                  <View className={styles.levelBadgeWrap}>
                    <LevelBadge level={qualityLevel} size='small' />
                  </View>
                </View>
              )}
              <View className={styles.body}>
                <Text className={styles.name}>{currentWaterfall.name}</Text>
                <Text className={styles.location}>📍 {currentWaterfall.location} · {currentWaterfall.aspect}坡</Text>
                <View className={styles.statsGrid}>
                  <DataCard label='冰瀑高度' value={currentWaterfall.height} unit='m' size='small' color='primary' />
                  <DataCard label='冰瀑倾角' value={currentWaterfall.angle} unit='°' size='small' />
                  <DataCard label='当前气温' value={currentWaterfall.temperature} unit='℃' size='small' color={currentWaterfall.temperature > 0 ? 'danger' : 'primary'} />
                  <DataCard label='24h气温' value={currentWaterfall.temperature24h} unit='℃' size='small' />
                  <DataCard label='72h气温' value={currentWaterfall.temperature72h} unit='℃' size='small' />
                  <DataCard label='日照时长' value={currentWaterfall.sunlightHours} unit='h' size='small' color='warning' />
                </View>
              </View>
            </View>
          </>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🏔️</Text>
            <Text className={styles.emptyText}>请选择或录入一个冰瀑</Text>
          </View>
        )}

        {showForm && (
          <>
            <SectionHeader title='录入新冰瀑' subtitle='填写冰瀑基础参数' />
            <View className={styles.formSection}>
              <View className={styles.inputGroup}>
                <Text className={styles.label}>冰瀑名称</Text>
                <Input
                  className={styles.textInput}
                  placeholder='如：仙女瀑'
                  value={formData.name}
                  onInput={(e) => setFormData({ ...formData, name: e.detail.value })}
                />
              </View>

              <View className={styles.inputGroup}>
                <Text className={styles.label}>位置</Text>
                <Input
                  className={styles.textInput}
                  placeholder='如：双桥沟·人参果坪'
                  value={formData.location}
                  onInput={(e) => setFormData({ ...formData, location: e.detail.value })}
                />
              </View>

              <View className={styles.inputGroup}>
                <View className={styles.inputRow}>
                  <Text className={styles.label}>冰瀑高度</Text>
                  <Text className={styles.value}>{formData.height}<Text className={styles.unit}>米</Text></Text>
                </View>
                <View className={styles.sliderWrap}>
                  <Slider
                    min={5}
                    max={200}
                    step={1}
                    value={formData.height}
                    activeColor='#1E88E5'
                    backgroundColor='#CFD8DC'
                    blockSize={24}
                    onChange={(e) => setFormData({ ...formData, height: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.inputGroup}>
                <View className={styles.inputRow}>
                  <Text className={styles.label}>冰瀑倾角</Text>
                  <Text className={styles.value}>{formData.angle}<Text className={styles.unit}>度</Text></Text>
                </View>
                <View className={styles.sliderWrap}>
                  <Slider
                    min={30}
                    max={90}
                    step={1}
                    value={formData.angle}
                    activeColor='#1E88E5'
                    backgroundColor='#CFD8DC'
                    blockSize={24}
                    onChange={(e) => setFormData({ ...formData, angle: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.inputGroup}>
                <View className={styles.inputRow}>
                  <Text className={styles.label}>当前气温</Text>
                  <Text className={styles.value}>{formData.temperature}<Text className={styles.unit}>℃</Text></Text>
                </View>
                <View className={styles.sliderWrap}>
                  <Slider
                    min={-30}
                    max={10}
                    step={1}
                    value={formData.temperature}
                    activeColor={formData.temperature > 0 ? '#F44336' : '#1E88E5'}
                    backgroundColor='#CFD8DC'
                    blockSize={24}
                    onChange={(e) => setFormData({ ...formData, temperature: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.inputGroup}>
                <View className={styles.inputRow}>
                  <Text className={styles.label}>24小时前气温</Text>
                  <Text className={styles.value}>{formData.temperature24h}<Text className={styles.unit}>℃</Text></Text>
                </View>
                <View className={styles.sliderWrap}>
                  <Slider
                    min={-35}
                    max={5}
                    step={1}
                    value={formData.temperature24h}
                    activeColor='#1E88E5'
                    backgroundColor='#CFD8DC'
                    blockSize={24}
                    onChange={(e) => setFormData({ ...formData, temperature24h: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.inputGroup}>
                <View className={styles.inputRow}>
                  <Text className={styles.label}>72小时前气温</Text>
                  <Text className={styles.value}>{formData.temperature72h}<Text className={styles.unit}>℃</Text></Text>
                </View>
                <View className={styles.sliderWrap}>
                  <Slider
                    min={-40}
                    max={0}
                    step={1}
                    value={formData.temperature72h}
                    activeColor='#1E88E5'
                    backgroundColor='#CFD8DC'
                    blockSize={24}
                    onChange={(e) => setFormData({ ...formData, temperature72h: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.inputGroup}>
                <View className={styles.inputRow}>
                  <Text className={styles.label}>日照时长</Text>
                  <Text className={styles.value}>{formData.sunlightHours}<Text className={styles.unit}>小时</Text></Text>
                </View>
                <View className={styles.sliderWrap}>
                  <Slider
                    min={0}
                    max={12}
                    step={0.5}
                    value={formData.sunlightHours}
                    activeColor='#FF9800'
                    backgroundColor='#CFD8DC'
                    blockSize={24}
                    onChange={(e) => setFormData({ ...formData, sunlightHours: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.inputGroup}>
                <Text className={styles.label}>坡向</Text>
                <View className={styles.aspectGrid}>
                  {aspectOptions.map(a => (
                    <Button
                      key={a}
                      className={classnames(styles.aspectItem, formData.aspect === a && styles.active)}
                      onClick={() => setFormData({ ...formData, aspect: a })}
                    >
                      {a}
                    </Button>
                  ))}
                </View>
              </View>

              <Button className={styles.submitButton} onClick={handleSubmit}>
                确认录入
              </Button>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

export default WaterfallPage
