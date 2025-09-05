import { Space, Row, Col, Form, Input, Tooltip, Tag, Button, message, Table } from 'antd'
import React, { useEffect, useState } from 'react';
import { getBalance } from '../api/index'
import type { DataType } from '../types/types'
import { shortenString } from '../utils/utils'

const Index: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [address, setAddress] = useState<string>('')
  const [page, setPage] = useState({ current: 1, pageSize: 2, total: 0 })

  //初始获取数据
  const getDataList = async () => {
    const data = await getBalance(address)
    const list: DataType[] = [
      {
        id: '1',
        address: 'kaspatest:qr2epum0jpmez0f8xh2wyja4d47tawjq9en8k6pm2ea3yvacc45zq35kvxn8k',
        amount: 100,
        sign: 'e185367dd88d1fd8034000138f14a57974458a180e8b507c715b215f6912558e',
        hash: '0x1234567890',
        status: 'success'
      },
      {
        id: '2',
        address: 'kaspatest:qzzs70n72mpzqpr3tzcd4yp9hlzdrn547fnxlgc5y9tg8e8566ugxm9ez4p56',
        amount: 100,
        sign: 'e185367dd88d1fd8034000138f14a57974458a180e8b507c715b215f6912558e',
        hash: '0x1234567890',
        status: 'failed'
      },
      {
        id: '3',
        address: 'kaspatest:qz65c2hyvkw784pthdtnj6pdgh6ua2nj42e6jvwrtr6pzwrj7vjvq7we6h6kv',
        amount: 100,
        sign: 'e185367dd88d1fd8034000138f14a57974458a180e8b507c715b215f6912558e',
        hash: '0x1234567890',
        status: 'pending'
      },
    ]
    if(data) {
      setTabLoading(false)
      setData(list)
    }
  }

  useEffect(() => {
    setTabLoading(true)
    getDataList()
  }, [address])

  // 提交
  const onSubmit = () => {
    setLoading(true)
    form.validateFields().then((values) => {
      const newRow: DataType = {
        id: Math.random().toString(36).substring(2, 6),
        address: values.address,
        amount: values.amount,
        sign: "signature",
        hash: Math.random().toString(36).substring(2, 12),
        status: Math.random()*10 > 5 ? "success" : "pending",
      };
      setData((prev) => [newRow, ...prev]);
      setPage((p) => ({ ...p, total: data.length + 1 }));
      form.resetFields();
      message.success("Transaction submitted successfully");
      setLoading(false)
    })
  }

  // 操作
  const handleAction = (record: DataType, action: string) => {
    if (action === "delete") {
      setData((prev) => prev.filter((item) => item.id !== record.id));
      message.success("Deleted successfully");
    } else if (action === "send") {
      message.info("Sent successfully");
    } else if (action === "edit") {
      message.info("Edited successfully");
      setData((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, status: "success" } : item
        )
      );
    }
  };

  //分页
  const pagedData = data.slice(
    (page.current - 1) * page.pageSize,
    page.current * page.pageSize
  );

  //表格
  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 100 },
    { title: "地址", dataIndex: "address", key: "address",
      render: (text: string) => {
        return <Tooltip title={text} >
            <span>{ shortenString(text, 3, 8) }</span>
          </Tooltip>
      }
    },
    { title: "金额", dataIndex: "amount", key: "amount" },
    { title: "签名", dataIndex: "sign", key: "sign",
      render: (text: string) => {
        return <Tooltip title={text} >
            <span>{ shortenString(text, 3, 8) }</span>
          </Tooltip>
      }
    },
    { title: "Hash", dataIndex: "hash", key: "hash",
      render: (text: string) => {
        return <Tooltip title={text} >
            <span>{ shortenString(text, 3, 8) }</span>
          </Tooltip>
      }
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: DataType["status"]) => {
        const color =
          status === "success" ? "green" : status === "failed" ? "red" : "blue";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "操作",
      key: "action",
      width: 210,
      render: (_: unknown, record: DataType) => ( // ✅ 类型安全
        <Space>
          <Button size="small" onClick={() => handleAction(record, "send")}>
            发送
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => handleAction(record, "edit")}
          >
            提交
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleAction(record, "delete")}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className='page-box'>
        <Row>
          <Form form={form} style={{ width: "100%"}} layout="inline" onFinish={onSubmit}>
            <Col span={8}>
              <Form.Item
                name="address"
                label="地址"
                rules={[{ required: true, message: "请输入地址" }]}
              >
                <Input placeholder="请输入地址" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="amount"
                label="金额"
                rules={[{ required: true, message: "请输入金额" }]}
              >
                <Input placeholder="请输入金额" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={2} offset={8}>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  提交
                </Button>
              </Form.Item></Col>
          </Form>
        </Row>
        <Table
          style={{ marginTop: 24, height: "calc(100vh - 300px)"  }}
          rowKey="id"
          size={"small"}
          columns={columns}
          dataSource={pagedData}
          loading={tabLoading}
          scroll={{ y: 500 }} 
          bordered
          pagination={{
            current: page.current,
            pageSize: page.pageSize,
            total: data.length,
            onChange: (current, pageSize) => {
              setPage({ ...page, current, pageSize });
            },
          }}
        />
      </div>
    </>
  )

}

export default Index