import { PropsWithChildren } from 'react'
import { AppProvider } from '@/store/AppContext'
import './app.scss'

function App(props: PropsWithChildren<any>) {
  return (
    <AppProvider>
      {props.children}
    </AppProvider>
  )
}

export default App
