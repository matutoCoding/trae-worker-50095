import React, { useState, useMemo } from 'react'
import { View, Text, Input, Slider, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import type { IceQualityData, IceQualityLevel, AreaMarker } from '@/types'
import { useAppContext } from '@/store/AppContext'
import SectionHeader from '@/components/SectionHeader'
import DataCard from '@/components/DataCard'
import WarningAlert from '@/components/WarningAlert'
import { iceColorOptions, hollowSoundOptions, getLevelDescription } from '@/data/mockData'
import { calculateIceQualityLevel, getIceQualityColor, getIceQualityLabel } from '@/utils/calculations'
import styles from './index.module.scss'

type IQD = IceQualityData

const QualityPage: React.FC = () => {
  const { currentWaterfall, setQualityData, qualityData } = useAppContext()

  const existingData = currentWaterfall ? qualityData[currentWaterfall.id] : null

  const [colorType, setColorType] = useState<IQD['colorType']>(existingData?.colorType || 'blue')
  const [bubbleDensity, setBubbleDensity] = useState<number>(existingData?.bubbleDensity ?? 15)
  const [hollowSound, setHollowSound] = useState<IQD['hollowSound']>(existingData?.hollowSound || 'none')
  const [thickness, setThickness] = useState<string>(String(existingData?.thickness || 15))

  const [brittleAreas, setBrittleAreas] = useState<AreaMarker[]>(existingData?.brittleAreas || [
    { id: 'b1', x: 20, y: 30, width: 15, height: 10, label: '顶部左侧脆冰区', severity: 'high' }
  ])
  const [thinAreas, setThinAreas] = useState<AreaMarker[]>(existingData?.thinAreas || [
    { id: 't1', x: 50, y: 60, width: 20, height: 12, label: '中部薄冰区', severity: 'medium' }
  ])

  React.useEffect(() => {
    if (currentWaterfall) {
      const data = qualityData[currentWaterfall.id]
      if (data) {
        setColorType(data.colorType)
        setBubbleDensity(data.bubbleDensity)
        setHollowSound(data.hollowSound)
        setThickness(String(data.thickness))
        setBrittleAreas(data.brittleAreas)
        setThinAreas(data.thinAreas)
      } else {
        setColorType('blue')
        setBubbleDensity(15)
        setHollowSound('none')
        setThickness('15')
        setBrittleAreas([{ id: 'b1', x: 20, y: 30, width: 15, height: 10, label: '顶部左侧脆冰区', severity: 'high' }])
        setThinAreas([{ id: 't1', x: 50, y: 60, width: 20, height: 12, label: '中部薄冰区', severity: 'medium' }])
      }
    }
  }, [currentWaterfall?.id])

  const qualityLevel: IceQualityLevel = useMemo(() => {
    return calculateIceQualityLevel({
      colorType,
      bubbleDensity,
      hollowSound,
      thickness: parseFloat(thickness) || 0
    })
  }, [colorType, bubbleDensity, hollowSound, thickness])

  const levelColor = getIceQualityColor(qualityLevel)
  const levelLabel = getIceQualityLabel(qualityLevel)
  const levelDesc = getLevelDescription(qualityLevel)
  const selectedColor = iceColorOptions.find(c => c.value === colorType)

  const handleSave = () => {
    if (!currentWaterfall) {
      Taro.showToast({ title: '请先选择冰瀑', icon: 'none' })
      return
    }

    const data: IceQualityData = {
      waterfallId: currentWaterfall.id,
      colorType,
      bubbleDensity,
      hollowSound,
      thickness: parseFloat(thickness) || 0,
      brittleAreas,
      thinAreas,
      overallLevel: qualityLevel,
      assessedAt: new Date().toISOString()
    }

    setQualityData(currentWaterfall.id, data)
    Taro.showToast({ title: '冰质评估已保存', icon: 'success' })
    console.log('[Quality] Assessment saved:', qualityLevel, 'for waterfall:', currentWaterfall.id)
  }

  const getSeverityLabel = (s: AreaMarker['severity']) => {
    return { low: '低度', medium: '中度', high: '高度' }[s]
  }

  if (!currentWaterfall) {
    return (
      <View className={styles.qualityPage}>
        <View className='page-container'>
          <View className={styles.noWaterfall}>
            <Text className={styles.icon}>❄️</Text>
            <Text className={styles.text}>请先在「冰瀑录入」页选择冰瀑</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className={styles.qualityPage}>
      <View className='page-container'>
        <View className='page-header'>
          <Text className='page-title'>冰质评估</Text>
          <Text className='page-subtitle'>{currentWaterfall.name} · 综合冰质等级判定</Text>
        </View>

        <View className={styles.levelOverview} style={{ background: `linear-gradient(180deg, ${levelColor}10 0%, #FFFFFF 100%)` }}>
          <Text className={styles.bigLevel} style={{ color: levelColor }}>{qualityLevel}</Text>
          <Text className={styles.levelLabel} style={{ color: levelColor }}>{levelLabel}</Text>
          <Text className={styles.levelDescription}>{levelDesc}</Text>
        </View>

        {(qualityLevel === 'D' || qualityLevel === 'E') && (
          <WarningAlert
            type={qualityLevel === 'E' ? 'critical' : 'danger'}
            title={qualityLevel === 'E' ? '禁止攀爬' : '高风险警示'}
            message={qualityLevel === 'E' ? '当前冰质极差，存在严重安全隐患，严禁任何攀爬活动' : '冰质较差，需加密保护点并严格控制攀爬人数'}
          />
        )}

        <SectionHeader title='冰层颜色' subtitle='冰的颜色反映纯净度和冻结质量' />
        <View className='card'>
          <View className={styles.colorGrid}>
            {iceColorOptions.map(opt => (
              <View
                key={opt.value}
                className={classnames(styles.colorItem, colorType === opt.value && styles.active)}
                onClick={() => setColorType(opt.value as IQD['colorType'])}
              >
                <View className={styles.colorBlock} style={{ backgroundColor: opt.color }} />
                <Text className={styles.colorName}>{opt.label}</Text>
              </View>
            ))}
          </View>
          {selectedColor && (
            <View className={styles.colorDesc}>
              {selectedColor.description}
            </View>
          )}
        </View>

        <SectionHeader title='气泡密度' subtitle='气泡含量影响冰的结构强度' />
        <View className='card'>
          <View className='row-between' style={{ marginBottom: '16rpx' }}>
            <Text style={{ fontSize: '28rpx', color: '#546E7A' }}>气泡占比</Text>
            <Text style={{ fontSize: '34rpx', fontWeight: 600, color: bubbleDensity > 50 ? '#F44336' : '#1E88E5' }}>{bubbleDensity}%</Text>
          </View>
          <View className={styles.bubbleSlider}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={bubbleDensity}
              activeColor={bubbleDensity > 50 ? '#F44336' : '#1E88E5'}
              backgroundColor='#CFD8DC'
              blockSize={24}
              onChange={(e) => setBubbleDensity(e.detail.value)}
            />
          </View>
          <View className={styles.bubbleLabels}>
            <Text className={styles.bubbleLabel}>极少</Text>
            <Text className={styles.bubbleLabel}>少量</Text>
            <Text className={styles.bubbleLabel}>中等</Text>
            <Text className={styles.bubbleLabel}>较多</Text>
            <Text className={styles.bubbleLabel}>密集</Text>
          </View>
        </View>

        <SectionHeader title='空鼓声检测' subtitle='敲击判断冰层内部空洞情况' />
        <View className='card'>
          <View className={styles.hollowGrid}>
            {hollowSoundOptions.map(opt => (
              <Button
                key={opt.value}
                className={classnames(styles.hollowItem, hollowSound === opt.value && styles.active)}
                onClick={() => setHollowSound(opt.value as IQD['hollowSound'])}
              >
                <Text className={styles.hollowLabel}>{opt.label}</Text>
                <Text className={styles.hollowDesc}>{opt.description}</Text>
              </Button>
            ))}
          </View>
        </View>

        <SectionHeader title='冰层厚度' subtitle='测量最薄处有效冰层厚度' />
        <View className='card'>
          <View className={styles.thicknessInput}>
            <Input
              className={styles.input}
              type='digit'
              value={thickness}
              onInput={(e) => setThickness(e.detail.value)}
              placeholder='输入厚度'
            />
            <Text className={styles.unit}>厘米</Text>
          </View>
          <View className={styles.thicknessHints}>
            <Text className={styles.hint}>{'<5cm 危险'}</Text>
            <Text className={styles.hint}>{'5-10cm 较薄'}</Text>
            <Text className={styles.hint}>{'10-15cm 一般'}</Text>
            <Text className={styles.hint}>{'>15cm 良好'}</Text>
          </View>
        </View>

        <SectionHeader title='危险区域标记' subtitle='标记脆冰区和薄冰区位置' />
        <View className={styles.dangerZones}>
          <View className={styles.zoneType}>
            <View className={styles.zoneHeader}>
              <Text className={styles.zoneTitle} style={{ color: '#FF9800' }}>🔥 脆冰区 ({brittleAreas.length})</Text>
            </View>
            <View className={styles.zoneList}>
              {brittleAreas.length === 0 ? (
                <View className={styles.emptyHint}>暂无脆冰区标记</View>
              ) : (
                brittleAreas.map(area => (
                  <View key={area.id} className={styles.zoneItem}>
                    <View className={styles.zoneInfo}>
                      <Text className={styles.zoneLabel}>{area.label}</Text>
                      <Text className={classnames(styles.severityBadge, styles[area.severity])}>
                        {getSeverityLabel(area.severity)}危险
                      </Text>
                    </View>
                    <Text className={styles.zonePosition}>位置：高度 {area.y}% 处，水平范围 {area.x}%-{area.x + area.width}%</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View className={styles.zoneType}>
            <View className={styles.zoneHeader}>
              <Text className={styles.zoneTitle} style={{ color: '#F44336' }}>⚠️ 薄冰区 ({thinAreas.length})</Text>
            </View>
            <View className={styles.zoneList}>
              {thinAreas.length === 0 ? (
                <View className={styles.emptyHint}>暂无薄冰区标记</View>
              ) : (
                thinAreas.map(area => (
                  <View key={area.id} className={styles.zoneItem}>
                    <View className={styles.zoneInfo}>
                      <Text className={styles.zoneLabel}>{area.label}</Text>
                      <Text className={classnames(styles.severityBadge, styles[area.severity])}>
                        {getSeverityLabel(area.severity)}危险
                      </Text>
                    </View>
                    <Text className={styles.zonePosition}>位置：高度 {area.y}% 处，水平范围 {area.x}%-{area.x + area.width}%</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        <SectionHeader title='评估数据汇总' />
        <View className='card' style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <DataCard label='综合评分' value={qualityLevel} color={qualityLevel === 'A' || qualityLevel === 'B' ? 'success' : qualityLevel === 'C' ? 'warning' : 'danger'} size='small' />
            <DataCard label='有效厚度' value={thickness} unit='cm' color={parseFloat(thickness) >= 15 ? 'success' : parseFloat(thickness) >= 8 ? 'warning' : 'danger'} size='small' />
            <DataCard label='气泡含量' value={bubbleDensity} unit='%' color={bubbleDensity <= 30 ? 'success' : bubbleDensity <= 60 ? 'warning' : 'danger'} size='small' />
            <DataCard label='空鼓状态' value={{ none: '无', slight: '轻微', moderate: '中度', severe: '严重' }[hollowSound]} color={hollowSound === 'none' ? 'success' : hollowSound === 'slight' ? 'primary' : hollowSound === 'moderate' ? 'warning' : 'danger'} size='small' />
          </View>
        </View>

        <Button className={styles.saveButton} onClick={handleSave}>
          保存冰质评估结果
        </Button>
      </View>
    </View>
  )
}

export default QualityPage
