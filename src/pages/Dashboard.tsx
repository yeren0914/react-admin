import { Card, Statistic, Row, Col } from 'antd'


export default function Dashboard() {
    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
                <Card><Statistic title="今日访问" value={1280} /></Card>
            </Col>
            <Col xs={24} md={8}>
                <Card><Statistic title="新注册" value={56} /></Card>
            </Col>
            <Col xs={24} md={8}>
                <Card><Statistic title="转化率" value={7.2} suffix="%" /></Card>
            </Col>
        </Row>
    )
}