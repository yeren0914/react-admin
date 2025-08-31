import { Card, Form, Input, Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import request from '../libs/request'
import { useAuth } from '../hooks/useAuth'


export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()


    const onFinish = async (values: { username: string; password: string }) => {
        try {
            // 示例：后端返回 { token, user }
            const data = await request.post('/login', values)
            login(data.token, data.user)
            message.success('登录成功')
            navigate('/dashboard')
        } catch (e: any) {
            message.error(e?.response?.data?.message || '登录失败')
        }
    }


    return (
        <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
            <Card title="登录" style={{ width: 360 }}>
                <Form onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                        <Input autoComplete="username" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                        <Input.Password autoComplete="current-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>登 录</Button>
                </Form>
            </Card>
        </div>
    )
}