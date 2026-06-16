import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface DataCardProps {
  label: string
  value: string | number
  unit?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  size?: 'small' | 'medium' | 'large'
  icon?: string
  className?: string
}

const DataCard: React.FC<DataCardProps> = ({
  label,
  value,
  unit,
  color = 'default',
  size = 'medium',
  className
}) => {
  return (
    <View className={classnames(
      styles.dataCard,
      styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
      styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`],
      className
    )}>
      <Text className={styles.label}>{label}</Text>
      <View className={styles.valueRow}>
        <Text className={styles.value}>{value}</Text>
        {unit && <Text className={styles.unit}>{unit}</Text>}
      </View>
    </View>
  )
}

export default DataCard
