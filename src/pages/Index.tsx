import { Space, Form, Input, Tag, Button, message, Table } from 'antd'
import React, { useEffect, useState } from 'react';
import { getBalance } from '../api/index'

interface DataType {
  id: string;
  address: string;
  amount: number;
  sign: string;
  hash: string;
  status: "pending" | "success" | "failed";
}

const Index: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>('')
  const [page, setPage] = useState({ current: 1, pageSize: 5, total: 0 })

  const getDataList = async () => {
    const data = await getBalance(address)
    console.log('data', data)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    getDataList()
  }, [address])

  // 提交
  const onSubmit = () => {
    setLoading(true)
    form.validateFields().then((values) => {
      const newRow: DataType = {
        id: Date.now().toString(),
        address: values.address,
        amount: values.amount,
        sign: "signature",
        hash: Math.random().toString(36).substring(2, 12),
        status: "pending",
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
    { title: "地址", dataIndex: "address", key: "address" },
    { title: "金额", dataIndex: "amount", key: "amount" },
    { title: "签名", dataIndex: "signature", key: "signature" },
    { title: "Hash", dataIndex: "hash", key: "hash" },
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
        <Form form={form} layout="inline" onFinish={onSubmit}>
          <Form.Item
            name="address"
            label="地址"
            rules={[{ required: true, message: "请输入地址" }]}
          >
            <Input placeholder="请输入地址" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: 260 }} />
          </Form.Item>
          <Form.Item
            name="amount"
            label="金额"
            rules={[{ required: true, message: "请输入金额" }]}
          >
            <Input placeholder="请输入金额" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              提交
            </Button>
          </Form.Item>
        </Form>
        <Table
          style={{ marginTop: 24 }}
          rowKey="id"
          columns={columns}
          dataSource={pagedData}
          scroll={{ y: 800 }}
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