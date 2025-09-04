import { Layout, Menu, Grid, theme, Dropdown, Space, Typography } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
const { Header, Sider, Content, Footer } = Layout
const { useToken } = theme
import { useAuth } from '../hooks/useAuth'

export default function AppLayout() {
  const { token: antdToken } = useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()


  const menuItems = [
    { key: '/dashboard', label: '仪表盘' },
  ]


  const selectedKeys = useMemo(() => {
    const found = menuItems.find((m) => pathname.startsWith(m.key))
    return found ? [found.key] : []
  }, [pathname])


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsedWidth={isMobile ? 0 : 64} breakpoint="md">
        <div style={{
          height: 48,
          margin: 12,
          borderRadius: 8,
          background: antdToken.colorFillTertiary,
        }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={(info) => navigate(info.key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: antdToken.colorBgContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingInline: 16,
        }}>
          <Typography.Title level={5} style={{ margin: 0 }}>管理后台</Typography.Title>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', label: '个人中心', onClick: () => navigate('/dashboard') },
                { type: 'divider' },
                { key: 'logout', danger: true, label: '退出登录', onClick: () => logout() },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <span>{user?.name || 'User'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ padding: 16, minHeight: 'calc(100vh - 160px)', background: antdToken.colorBgContainer, borderRadius: 12 }}>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>© {new Date().getFullYear()} Admin Scaffold</Footer>
      </Layout>
    </Layout>
  )
}