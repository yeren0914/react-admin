import React, { useState, useEffect } from "react";
import { Card, Typography, Select, Row, Col, Button, Input, Space } from "antd";
import HeaderBar from "../components/HeaderBar";
import TransactionForm from "../components/TransactionForm";
import TransactionTable from "../components/TransactionTable";
import { useMessageApi } from "../components/MessageProvider";
import { getTxs } from "../api/index";
import { formatDateTime } from '../utils/utils'
import { useAuth } from '../hooks/useAuth'
import { TransactionStatusList } from '../utils/constants'
import type { DataType, CreateParams } from "../types/types";
import Aurora from '../components/Aurora';

const { Title } = Typography;

interface GetDataListParams { id?: number; status?: number; }

const Index: React.FC = () => {
  const showMsg = useMessageApi();
  const { refreshFlag, user } = useAuth();
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchParams, setSearchParams] = useState({ id: '', status: '' });
  const [txType, setTxType] = useState(0);
  const [createParams, setCreateParams] = useState<CreateParams>({
    type: 1, toAddress: "", oldAddress: "", newAddress: "", removeAddress: "", threshold: 1,
  });

  const searchFun = () => {
    if (!user?.address) { showMsg('error', 'Please login first'); return }
    if (loading) return;
    const id = Number(searchParams.id);
    const status = Number(searchParams.status);
    const params: { id?: number; status?: number } = {};
    if (!isNaN(id) && id > 0) params.id = id;
    if (!isNaN(status) && status > 0) params.status = status;
    getDataList(params);
  };

  const resetFun = () => {
    if (!user?.address) { showMsg('error', 'Please login first'); return }
    if (loading) return;
    setSearchParams({ id: '', status: '' }); 
    getDataList({});
  }

  const getDataList = async ({ id, status }: GetDataListParams) => {
    setLoading(true);
    const res = await getTxs(page.current - 1, page.pageSize, id, status);
    if (res.success && res.data) {
      const rows = (res.data.rows as DataType[]).map(item => ({
        ...item, createdAtFormatted: formatDateTime(item.createdAt), btnLoading: false
      }));
      setData(rows);
      setPage(p => ({ ...p, total: res.data.total }));
    } else {
      showMsg("error", res.error?.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) getDataList({});
    else {
      setData([]);
    }
  }, [page.current, page.pageSize, refreshFlag]);

  return (
    <div className="page-container">
        <Aurora
          colorStops={['#7cff67', '#25E2DD', '#008f8d']}
          blend={0.6}
          amplitude={1.0}
          speed={0.3}
        />
        <HeaderBar />
        <div className="page-content">
          <Card style={{ marginTop: 24, marginBottom: 24 }}>
            <Row align="middle" gutter={16} wrap>
              <Col flex="200px">
                <Title level={5} className="section-title">Create Transaction</Title>
              </Col>
              <Col flex="auto">
                <TransactionForm
                  txType={txType}
                  setTxType={setTxType}
                  createParams={createParams}
                  setCreateParams={setCreateParams}
                />
              </Col>
            </Row>
          </Card>
          <Card style={{ marginBottom: 24 }}>
            <Row align="middle" gutter={[12, 12]}>
              <Col flex="200px">
                <Title level={5} className="section-title">Transactions</Title>
              </Col>
              <Col flex="220px">
                <Input
                  value={searchParams.id}
                  onChange={e => setSearchParams({ ...searchParams, id: e.target.value })}
                  placeholder="Please enter the query ID"
                />
              </Col>
              <Col flex="220px">
                <Select
                  value={searchParams.status || undefined}
                  style={{ width: "100%" }}
                  placeholder="Status Filtering"
                  onChange={(v) => setSearchParams({ ...searchParams, status: v })}
                  allowClear
                >
                  {TransactionStatusList.map((item) => (
                    <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
                  ))}
                </Select>
              </Col>
              <Col flex="none">
                <Space>
                  <Button type="primary" onClick={searchFun}>Query</Button>
                  <Button onClick={() => { resetFun() }}>Reset</Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Card>
            <TransactionTable
              data={data}
              loading={loading}
              page={page}
              onPageChange={(c, s) => setPage({ ...page, current: c, pageSize: s })}
            />
          </Card>
        </div>
    </div>
  );
};

export default Index;
