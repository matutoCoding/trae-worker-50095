import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import { getIceQualityLabel, getIceQualityColor } from '@/utils/calculations'
import type { IceQualityLevel } from '@/types'
import styles from './index.module.scss'

interface LevelBadgeProps {
  level: IceQualityLevel
  showLabel?: boolean
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  showLabel = true,
  size = 'medium',
  className
}) => {
  const color = getIceQualityColor(level)
  const label = getIceQualityLabel(level)

  return (
    <View className={classnames(
      styles.levelBadge,
      styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
      className
    )} style={{ backgroundColor: `${color}15`, borderColor: color }}>
      <Text className={styles.levelText} style={{ color }}>{level}</Text>
      {showLabel && <Text className={styles.labelText} style={{ color }}>{label}</Text>}
    </View>
  )
}

export default LevelBadge
