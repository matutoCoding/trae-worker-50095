import type { WaterfallData, RouteRecord, TemperatureAlert, RouteCategory, IceColumnRisk, IceQualityLevel } from '@/types'

export const mockWaterfalls: WaterfallData[] = [
  {
    id: 'wf-001',
    name: '仙女瀑',
    location: '双桥沟·人参果坪',
    height: 45,
    angle: 78,
    temperature: -3,
    temperature24h: -8,
    temperature72h: -12,
    sunlightHours: 5.5,
    aspect: '东北',
    photoUrl: 'https://picsum.photos/id/1036/750/500',
    createdAt: '2024-01-15T08:00:00Z'
  },
  {
    id: 'wf-002',
    name: '龙之涎',
    location: '双桥沟·红松林',
    height: 62,
    angle: 85,
    temperature: -1,
    temperature24h: -6,
    temperature72h: -10,
    sunlightHours: 4.2,
    aspect: '北',
    photoUrl: 'https://picsum.photos/id/1018/750/500',
    createdAt: '2024-01-14T09:30:00Z'
  },
  {
    id: 'wf-003',
    name: '冰晶壁',
    location: '双桥沟·布达拉峰',
    height: 38,
    angle: 70,
    temperature: -5,
    temperature24h: -10,
    temperature72h: -15,
    sunlightHours: 6.8,
    aspect: '东',
    photoUrl: 'https://picsum.photos/id/1015/750/500',
    createdAt: '2024-01-13T10:00:00Z'
  },
  {
    id: 'wf-004',
    name: '银河坠',
    location: '结斯沟·大厂',
    height: 80,
    angle: 88,
    temperature: 2,
    temperature24h: -4,
    temperature72h: -8,
    sunlightHours: 3.5,
    aspect: '西北',
    photoUrl: 'https://picsum.photos/id/1044/750/500',
    createdAt: '2024-01-12T11:00:00Z'
  }
]

const mockRisks: IceColumnRisk[] = [
  {
    id: 'risk-001',
    position: '顶部左侧',
    rootConnection: 'medium',
    hangingIce: true,
    size: 'medium',
    noStopZone: true,
    riskLevel: 'high'
  },
  {
    id: 'risk-002',
    position: '中部偏右',
    rootConnection: 'strong',
    hangingIce: false,
    size: 'small',
    noStopZone: false,
    riskLevel: 'low'
  }
]

export const mockRoutes: RouteRecord[] = [
  {
    id: 'route-001',
    name: '仙女瀑·主线路',
    waterfallId: 'wf-001',
    difficulty: 'WI4',
    protectionPoints: 9,
    qualityLevel: 'B',
    temperatureRange: [-15, -2],
    photoUrls: [
      'https://picsum.photos/id/1036/750/500',
      'https://picsum.photos/id/1039/750/500'
    ],
    risks: mockRisks,
    createdAt: '2024-01-15T08:00:00Z',
    lastUpdated: '2024-01-15T14:30:00Z',
    notes: '主线路冰质良好，顶部左侧有悬挂冰柱需避让'
  },
  {
    id: 'route-002',
    name: '龙之涎·左线',
    waterfallId: 'wf-002',
    difficulty: 'WI5',
    protectionPoints: 12,
    qualityLevel: 'C',
    temperatureRange: [-12, -3],
    photoUrls: [
      'https://picsum.photos/id/1018/750/500'
    ],
    risks: [],
    createdAt: '2024-01-14T09:30:00Z',
    lastUpdated: '2024-01-14T16:00:00Z',
    notes: '左线中部有薄冰区，需要额外保护点'
  },
  {
    id: 'route-003',
    name: '冰晶壁·新手线',
    waterfallId: 'wf-003',
    difficulty: 'WI3',
    protectionPoints: 7,
    qualityLevel: 'A',
    temperatureRange: [-20, 0],
    photoUrls: [
      'https://picsum.photos/id/1015/750/500'
    ],
    risks: [],
    createdAt: '2024-01-13T10:00:00Z',
    lastUpdated: '2024-01-13T15:00:00Z',
    notes: '冰质极优，适合新手训练，日落前有短暂日照'
  },
  {
    id: 'route-004',
    name: '银河坠·挑战线',
    waterfallId: 'wf-004',
    difficulty: 'WI6',
    protectionPoints: 16,
    qualityLevel: 'D',
    temperatureRange: [-10, -5],
    photoUrls: [
      'https://picsum.photos/id/1044/750/500'
    ],
    risks: [mockRisks[0]],
    createdAt: '2024-01-12T11:00:00Z',
    lastUpdated: '2024-01-12T17:30:00Z',
    notes: '温度较高，仅限清晨攀爬，午后冰质恶化严重'
  },
  {
    id: 'route-005',
    name: '仙女瀑·右线',
    waterfallId: 'wf-001',
    difficulty: 'WI4+',
    protectionPoints: 10,
    qualityLevel: 'B',
    temperatureRange: [-12, -2],
    photoUrls: [],
    risks: [],
    createdAt: '2024-01-11T09:00:00Z',
    lastUpdated: '2024-01-11T14:00:00Z',
    notes: '右线角度略大，保护点间距需要缩小'
  },
  {
    id: 'route-006',
    name: '龙之涎·右线',
    waterfallId: 'wf-002',
    difficulty: 'WI5+',
    protectionPoints: 14,
    qualityLevel: 'C',
    temperatureRange: [-15, -5],
    photoUrls: [],
    risks: [mockRisks[1]],
    createdAt: '2024-01-10T08:30:00Z',
    lastUpdated: '2024-01-10T16:30:00Z',
    notes: '右线有悬垂冰段，需要经验丰富的攀爬者'
  }
]

export const mockAlerts: TemperatureAlert[] = [
  {
    id: 'alert-001',
    type: 'rapid_rise',
    severity: 'danger',
    message: '24小时内气温骤升7℃，冰质稳定性下降',
    temperatureNow: -1,
    temperatureChange: 7,
    affectedRoutes: ['route-002', 'route-004'],
    timestamp: '2024-01-15T06:00:00Z',
    acknowledged: false
  },
  {
    id: 'alert-002',
    type: 'melting_risk',
    severity: 'warning',
    message: '午后气温将升至0℃以上，注意融化时间窗',
    temperatureNow: -3,
    temperatureChange: 5,
    affectedRoutes: ['route-001', 'route-003'],
    timestamp: '2024-01-15T07:30:00Z',
    acknowledged: false
  },
  {
    id: 'alert-003',
    type: 'collapse_risk',
    severity: 'critical',
    message: '银河瀑区域72小时升温10℃，存在整幕崩塌风险！',
    temperatureNow: 2,
    temperatureChange: 10,
    affectedRoutes: ['route-004'],
    timestamp: '2024-01-15T05:00:00Z',
    acknowledged: false
  }
]

export const mockCategories: RouteCategory[] = [
  {
    id: 'cat-001',
    name: '极寒稳定区',
    temperatureRange: [-30, -10],
    qualityLevels: ['A', 'B'],
    routeIds: ['route-003', 'route-006'],
    description: '持续低温环境下的优质稳定线路，全天可攀爬'
  },
  {
    id: 'cat-002',
    name: '常规作业区',
    temperatureRange: [-15, -3],
    qualityLevels: ['A', 'B', 'C'],
    routeIds: ['route-001', 'route-002', 'route-005'],
    description: '常规攀冰温度区间，上午冰质最佳，午后需观察'
  },
  {
    id: 'cat-003',
    name: '清晨限定区',
    temperatureRange: [-10, 0],
    qualityLevels: ['B', 'C', 'D'],
    routeIds: ['route-004'],
    description: '温度接近冰点，仅限清晨低温时段攀爬，午后禁止作业'
  },
  {
    id: 'cat-004',
    name: '高危禁攀区',
    temperatureRange: [-5, 10],
    qualityLevels: ['D', 'E'],
    routeIds: [],
    description: '温度过高或冰质极差，禁止任何攀爬活动'
  }
]

export const iceColorOptions: { value: string; label: string; color: string; description: string }[] = [
  { value: 'transparent', label: '透明冰', color: '#E3F2FD', description: '纯水冻结，冰质最佳' },
  { value: 'blue', label: '蓝冰', color: '#90CAF9', description: '高密度冰，稳定性好' },
  { value: 'white', label: '白冰', color: '#FAFAFA', description: '含空气较多，强度一般' },
  { value: 'milky', label: '乳白冰', color: '#ECEFF1', description: '多孔结构，强度较差' },
  { value: 'brown', label: '褐色冰', color: '#A1887F', description: '含杂质多，非常危险' }
]

export const hollowSoundOptions: { value: string; label: string; description: string }[] = [
  { value: 'none', label: '无空鼓', description: '敲击声音清脆坚实' },
  { value: 'slight', label: '轻微空鼓', description: '部分区域声音略闷' },
  { value: 'moderate', label: '中度空鼓', description: '声音发闷，需谨慎' },
  { value: 'severe', label: '严重空鼓', description: '空洞声明显，极度危险' }
]

export const aspectOptions: string[] = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']

export const difficultyOptions: string[] = ['WI2', 'WI3', 'WI3+', 'WI4', 'WI4+', 'WI5', 'WI5+', 'WI6', 'WI6+', 'WI7']

export const getLevelDescription = (level: IceQualityLevel): string => {
  const descriptions: Record<IceQualityLevel, string> = {
    A: '冰质致密坚硬，无气泡无杂质，抗拔力极强，保护点可靠性极高',
    B: '冰质良好，少量气泡，结构稳定，保护点可靠',
    C: '冰质一般，中等气泡含量，部分区域可能偏软，需加强保护',
    D: '冰质较差，多气泡或有分层，强度明显不足，需加密保护点',
    E: '冰质极差，严重空鼓或融化，结构不稳定，禁止攀爬'
  }
  return descriptions[level]
}
