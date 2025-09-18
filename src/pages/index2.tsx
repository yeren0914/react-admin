import React, { useEffect, useMemo, useState } from "react";
import {
  Space,
  Input,
  Tooltip,
  Badge,
  Button,
  Table,
  Card,
  Typography,
  Empty,
  ConfigProvider,
  theme,
  Row,
  Col,
  Popconfirm,
  Select,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BadgeProps } from "antd";
import { useMessageApi } from '../components/MessageProvider'
import {
  SendOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { getTxs, createTx, delTxId, updateTxById } from "../api/index";
import { useAuth } from "../hooks/useAuth";
import { ListStatus } from '../types/enum'
import type { DataType, MultiSignTx, CreateParams } from "../types/types";
import { shortenString, formatDateTime } from "../utils/utils";
import { ownerList, TransactionType, executor } from '../utils/constants'
import Tx from '../wallet/index'
import HeaderBar from "../components/HeaderBar";

const { Text, Title } = Typography;

type CopyableProps = { value: string; display: string };

const Copyable: React.FC<CopyableProps> = ({ value, display }) => {
  const showMsg = useMessageApi()
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      showMsg("success", "复制成功")
    } catch {
      showMsg("error", "复制失败")
    }
  };
  return (
    <Space size={6}>
      <Text ellipsis style={{ maxWidth: 220 }}>
        {display}
      </Text>
      <Tooltip placement="right" title="复制">
        <Button
          size="small"
          type="text"
          aria-label="复制"
          icon={<CopyOutlined />}
          onClick={onCopy}
        />
      </Tooltip>
    </Space>
  );
};

const Index: React.FC = () => {
  const { loginHooks, user } = useAuth()
  const [data, setData] = useState<DataType[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [page, setPage] = useState({ current: 1, pageSize: 5, total: 0 });
  const showMsg = useMessageApi()

  //交易
  const [txLoading, setTxLoading] = useState(false);
  const [txType, setTxType] = useState(0)
  const [createParams, setCreateParams] = useState<CreateParams>({
    type: 1,
    toAddress: '',
    oldAddress: '',
    newAddress: '',
    removeAddress: '',
    threshold: 2
  })

  const tx = useMemo(() => {
    const instance = new Tx();
    instance.connectWallet();
    return instance;
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const userInfo = localStorage.getItem("user");
      if (userInfo) {
        const user = JSON.parse(userInfo)
        loginHooks(token, { address: user.address })
      }
      getDataList();
    }
  }, []);

  const checkUser = () => {
    if (!user?.address) {
      showMsg('error', '请先登录')
      return false
    }
    return true
  }

  //检测是否可删除
  const checkDelete = (record: DataType) => {
    return !(record.status === 1 && user?.address === record.creator)
  }

  // 获取交易列表
  const getDataList = async () => {
    setTabLoading(true);
    const getList = await getTxs(page.current - 1, page.pageSize);
    if (getList.success && getList.data) {
      const total = getList.data.total;
      const rows = (getList.data.rows as DataType[]).map(item => ({
        ...item,
        createdAtFormatted: formatDateTime(item.createdAt),
        btnLoading: false
      }));
      setPage((p) => ({ ...p, total }));
      setData(rows)
    } else {
      showMsg('error', getList.error?.message)
    }
    setTabLoading(false);
  };

  const pagedData = useMemo(
    () => data.slice((page.current - 1) * page.pageSize, page.current * page.pageSize),
    [data, page]
  );

  //更新按钮状态
  const setRowLoading = (id: string, loading: boolean) => {
    setData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, btnLoading: loading } : item
      )
    )
  }

  //创建交易
  const createTxFun = async () => {
    if (!checkUser()) return
    if (!createParams.toAddress) {
      showMsg('error', '请输入收款地址')
      return
    }
    try {
      setTxLoading(true)
      if (window.ethereum) {
        const getParams = await tx.createTransaction(createParams)
        if (getParams) {
          const params = {
            to: getParams.to,
            data: getParams.data,
            value: 0,
            nonce: getParams.nonce,
            signature: getParams.signature
          }
          const res = await createTx(params.to, params.data, params.value.toString(), Number(params.nonce), params.signature)
          if (res.success) {
            showMsg('success', 'Create transaction success')
            getDataList()
          } else {
            showMsg('error', res.error?.message || 'Create transaction failed')
          }
        }
      }
    } catch (error) {
      console.log('error', error)
      const msg = typeof error === 'string' ? error : 'Create transaction failed'
      showMsg('error', msg)
    } finally {
      setTxLoading(false)
    }
  }

  // 再次签名
  const sendTx = async (record: DataType) => {
    if (!checkUser() || !user?.address) return
    if (user?.address.toLocaleLowerCase() === record.creator.toLocaleLowerCase()) {
      showMsg('error', '请勿发送非自己创建的合约交易')
      return
    }
    if (record.status === 1 && !ownerList.includes(user?.address)) {
      showMsg('error', '当前账户不是owner')
      return
    }
    const txData: MultiSignTx = {
      id: record.id,
      to: record.to,
      value: BigInt(record.value),
      data: record.data,
      creator: record.creator,
      nonce: record.nonce,
      signature: record.signature,
      status: record.status,
    }
    try {
      setRowLoading(record.id, true)
      const txs = await tx.multiSign(txData)
      console.log('txs', txs)
      if (txs && txs.txid) {
        const res = await updateTxById(record.id, 3, txs!.txid)
        if (res.success) {
          showMsg('success', '更新成功')
          getDataList()
        } else {
          showMsg('error', res.error?.message)
        }
      }
    } catch (error) {
      const msg = typeof error === 'string' ? error : '发送交易失败！'
      showMsg('error', msg)
    } finally {
      setRowLoading(record.id, false)
    }
  }

  // 更新数据
  const updateFun = async (record: DataType) => {
    if (user?.address.toLocaleLowerCase() !== executor.toLocaleLowerCase()) {
      showMsg('warning', '当前账户无权限')
      return false
    }
    const txData: MultiSignTx = {
      id: record.id,
      to: record.to,
      value: BigInt(record.value),
      data: record.data,
      creator: record.creator,
      nonce: record.nonce,
      signature: record.signature,
      status: record.status,
    }
    try {
      setRowLoading(record.id, false)
      const txs = await tx.sendTransaction(txData)
      if (txs && txs.txid) {
        const res = await updateTxById(record.id, txs.status, txs!.txid)
        if (res.success) {
          showMsg('success', '发送成功')
          getDataList()
        } else {
          showMsg('error', res.error?.message)
        }
      }
    } catch (error) {
      const msg = typeof error === 'string' ? error : '发送交易失败！'
      showMsg('error', msg)
    } finally {
      setRowLoading(record.id, false)
    }
  }

  // 删除
  const deleteFun = async (record: DataType) => {
    if (!checkUser() || !record.id) return
    const res = await delTxId(record.id)
    if (res.success) {
      showMsg('success', '删除成功')
      setData((prev) =>
        prev.filter((item) =>
          item.id !== record.id
        )
      );
    } else {
      showMsg('error', res.error?.message ?? '删除失败')
    }
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      fixed: "left",
      width: 40,
      render: (_: unknown, __: DataType, index: number) => index + 1
    },
    {
      title: "地址",
      dataIndex: "to",
      key: "to",
      fixed: "left",
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text} placement="right">
          <Copyable value={text} display={shortenString(text, 4, 10)} />
        </Tooltip>
      ),
    },
    { title: "金额", dataIndex: "value", key: "value", width: 80 },
    {
      title: "签名",
      dataIndex: "signature",
      key: "signature",
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text} placement="right">
          <Copyable value={text} display={shortenString(text, 4, 10)} />
        </Tooltip>
      ),
    },
    {
      title: "创建地址",
      dataIndex: "creator",
      key: "creator",
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text} placement="right">
          <Copyable value={text} display={shortenString(text, 4, 10)} />
        </Tooltip>
      ),
    },
    { title: "Nonce", dataIndex: "nonce", key: "nonce", width: 80 },
    {
      title: "创建时间",
      dataIndex: "createdAtFormatted",
      key: "createdAtFormatted",
      width: 140,
    },
    {
      title: "ExecutionTxHash",
      dataIndex: "executionTxHash",
      key: "executionTxHash",
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        text ?
          <Tooltip title={text} placement="right">
            <Copyable value={text} display={shortenString(text, 2, 6)} />
          </Tooltip> : '-'
      ),
    },
    {
      title: "ProposalTxHash",
      dataIndex: "proposalTxHash",
      key: "proposalTxHash",
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        text ?
          <Tooltip title={text} placement="right">
            <Copyable value={text} display={shortenString(text, 2, 6)} />
          </Tooltip> : '-'
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      fixed: "right",
      width: 120,
      render: (status: number) => {
        const map: Record<number, { s: BadgeProps["status"]; text: string }> = {
          0: { s: "default", text: ListStatus[0] },
          1: { s: "processing", text: ListStatus[1] },
          2: { s: "processing", text: ListStatus[2] },
          3: { s: "warning", text: ListStatus[3] },
          4: { s: "success", text: ListStatus[4] },
          5: { s: "error", text: ListStatus[5] },
        };
        return <Badge status={map[status].s} text={map[status].text} />;
      }
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 230,
      render: (_: unknown, record: DataType) => (
        <Space wrap>
          <Button size="small" disabled={record.status !== 1} icon={<SendOutlined />} onClick={() => sendTx(record)}>
            签名
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={record.status !== 3}
            icon={<EditOutlined />}
            onClick={() => {
              updateFun(record)
            }
            }
          >
            发送
          </Button>
          <Popconfirm
            title="删除提示"
            description="确定要删除吗?"
            onConfirm={() => deleteFun(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" disabled={checkDelete(record)} danger icon={<DeleteOutlined />} >删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          colorBgLayout: "#f5f7fb",
          borderRadius: 10,
          boxShadowSecondary: "0 6px 20px rgba(0,0,0,0.06)",
        },
        components: {
          Card: { headerBg: "#ffffff", padding: 16, borderRadiusLG: 16 },
          Table: { headerBg: "#fafafa", headerColor: "#2b2f36", borderRadius: 12 },
        },
      }}
    >
      <div className="page-container text-right">
        {/* 顶部 Header */}
        <HeaderBar />
        <div className="page-content">
          <Title level={5} style={{ marginBottom: 12 }}>创建交易</Title>
          <Card>
            <Row gutter={20}>
              {/* 选择交易类型 */}
              <Col span={6}>
                <Select
                  style={{ width: '100%' }}
                  onChange={(value) => setTxType(Number(value))}
                  placeholder="选择交易类型"
                >
                  {TransactionType.map(item => (
                    <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
                  ))}
                </Select>
              </Col>

              {/* 动态输入项 */}
              {txType === 1 && (
                <Col span={6}>
                  <Input
                    placeholder="请输入接收地址"
                    value={createParams.toAddress}
                    onChange={(e) => setCreateParams({ ...createParams, toAddress: e.target.value })}
                  />
                </Col>
              )}

              {txType === 2 && (
                <Col span={6}>
                  <Input
                    placeholder="请输入费用接收地址"
                    value={createParams.removeAddress}
                    onChange={(e) => setCreateParams({ ...createParams, removeAddress: e.target.value })}
                  />
                </Col>
              )}

              {txType === 3 && (
                <>
                  <Col span={6}>
                    <Input
                      placeholder="请输入接收地址"
                      value={createParams.toAddress}
                      onChange={(e) => setCreateParams({ ...createParams, toAddress: e.target.value })}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="请输入阈值"
                      value={createParams.threshold}
                      onChange={(e) => setCreateParams({ ...createParams, threshold: Number(e.target.value) })}
                    />
                  </Col>
                </>
              )}

              {txType === 4 && (
                <>
                  <Col span={6}>
                    <Input
                      placeholder="请输入费用接收地址"
                      value={createParams.removeAddress}
                      onChange={(e) => setCreateParams({ ...createParams, removeAddress: e.target.value })}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="请输入阈值"
                      value={createParams.threshold}
                      onChange={(e) => setCreateParams({ ...createParams, threshold: Number(e.target.value) })}
                    />
                  </Col>
                </>
              )}

              {txType === 5 && (
                <>
                  <Col span={6}>
                    <Input
                      placeholder="请输入旧地址"
                      value={createParams.oldAddress}
                      onChange={(e) => setCreateParams({ ...createParams, oldAddress: e.target.value })}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      placeholder="请输入新地址"
                      value={createParams.newAddress}
                      onChange={(e) => setCreateParams({ ...createParams, newAddress: e.target.value })}
                    />
                  </Col>
                </>
              )}

              <Col span={6}>
                <Button
                  color="cyan"
                  variant="solid"
                  loading={txLoading}
                  onClick={() => createTxFun()}
                >
                  提交交易
                </Button>
              </Col>
            </Row>
          </Card>
          <Title level={5} style={{ marginBottom: 12 }}>交易记录</Title>
          <Card style={{ marginTop: 16 }}>
            <Table<DataType>
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={pagedData}
              loading={tabLoading}
              tableLayout="fixed"
              bordered={false}
              sticky
              scroll={{ x: 1200, y: 480 }}
              locale={{ emptyText: <Empty description="暂无数据" /> }}
              pagination={{
                current: page.current,
                pageSize: page.pageSize,
                total: page.total,
                showSizeChanger: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
                onChange: (current, pageSize) => setPage({ ...page, current, pageSize }),
              }}
              rowClassName={(_, index) => (index % 2 === 0 ? "table-row-even" : "table-row-odd")}
            />
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Index;