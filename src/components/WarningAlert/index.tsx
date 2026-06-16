import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface WarningAlertProps {
  type?: 'warning' | 'danger' | 'critical' | 'info' | 'success'
  title: string
  message?: string
  showIcon?: boolean
  className?: string
}

const WarningAlert: React.FC<WarningAlertProps> = ({
  type = 'warning',
  title,
  message,
  className
}) => {
  return (
    <View className={classnames(
      styles.warningAlert,
      styles[`type${type.charAt(0).toUpperCase() + type.slice(1)}`],
      className
    )}>
      <View className={styles.header}>
        <View className={styles.dot} />
        <Text className={styles.title}>{title}</Text>
      </View>
      {message && <Text className={styles.message}>{message}</Text>}
    </View>
  )
}

export default WarningAlert
