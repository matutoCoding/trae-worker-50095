export default defineAppConfig({
  pages: [
    'pages/waterfall/index',
    'pages/quality/index',
    'pages/protection/index',
    'pages/route/index',
    'pages/warning/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '攀冰安全规划系统',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F9FC'
  },
  tabBar: {
    color: '#90A4AE',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/waterfall/index',
        text: '冰瀑录入'
      },
      {
        pagePath: 'pages/quality/index',
        text: '冰质评估'
      },
      {
        pagePath: 'pages/protection/index',
        text: '保护打点'
      },
      {
        pagePath: 'pages/route/index',
        text: '路线档案'
      },
      {
        pagePath: 'pages/warning/index',
        text: '温度预警'
      }
    ]
  }
})
