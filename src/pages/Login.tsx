import { Card, Form, Input, Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'


export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()


    const onFinish = async (values: { username: string; password: string }) => {
        try {
            console.log('values', values)
            login('12345', { id: '23', name: 'admin'})
            message.success('登录成功')
            navigate('/dashboard')
        } catch (error: unknown) {
            message.error((error as Error).message || '登录失败')
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