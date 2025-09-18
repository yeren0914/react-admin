import React, { useState, useMemo } from "react";
import { Table, Space, Tooltip, Button, Badge, Popconfirm, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { BadgeProps } from "antd";
import { useMessageApi } from "../components/MessageProvider";
import { SendOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Copyable from "./Copyable";
import { delTxId, updateTxById } from "../api/index";
import { shortenString } from "../utils/utils";
import { ListStatus } from "../types/enum";
import { useAuth } from '../hooks/useAuth'
import { ownerList, executor } from '../utils/constants'
import { useTx } from '../hooks/useTx'
import type { DataType, MultiSignTx } from "../types/types";

type Props = {
  data: DataType[];
  loading: boolean;
  page: { current: number; pageSize: number; total: number };
  onPageChange: (current: number, pageSize: number) => void;
};

const TransactionTable: React.FC<Props> = ({
  data,
  loading,
  page,
  onPageChange,
}) => {
  const showMsg = useMessageApi();
  const { user, triggerRefresh } = useAuth();
  const [signLoading, setSignLoading] = useState<Record<string, boolean>>({});
  const [sendLoading, setSendLoading] = useState<Record<string, boolean>>({});

  const { tx } = useTx();
  const processedData = useMemo(() => {
    if (!tx) return data;
    return data.map((item) => {
      let receiver = item.receiver;
      let createType = item.createType;
      try {
        const decoded = tx.decodeCalldata(item.data);
        if (decoded?.feeDispatcherOperation?.receiver) {
          receiver = decoded.feeDispatcherOperation.receiver;
        }
        if (decoded?.feeDispatcherOperation?.type) {
          createType = decoded.feeDispatcherOperation.type;
        }
      } catch (err) {
        console.warn("decodeCalldata error", err);
      }
      return {
        ...item,
        receiver,
        createType,
      };
    });
  }, [data, tx]);
  

  //构建数据结构
  const buildTxData = (record: DataType): MultiSignTx => ({
    id: record.id,
    to: record.to,
    value: BigInt(record.value),
    data: record.data,
    creator: record.creator,
    nonce: record.nonce,
    signature: record.signature,
    status: record.status,
  });

  // 处理按钮loading
  const withLoading = async (
    record: DataType,
    loadingSetter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    task: () => Promise<void>
  ) => {
    if (!record.id) return;
    loadingSetter((prev) => ({ ...prev, [record.id]: true }));
    try {
      await task();
    } catch (error) {
      const msg = typeof error === "string" ? error : "Operation failed!";
      showMsg("error", msg);
    } finally {
      loadingSetter((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  // 再次签名
  const onSign = async (record: DataType) => {
    if (!user?.address || !user?.address || !tx) return
    if (record.status === 1 && !ownerList.includes(user?.address)) {
      showMsg('error', 'The current account is not owner')
      return
    }
    await withLoading(record, setSignLoading, async () => {
      const txData = buildTxData(record);
      const txs = await tx.multiSign(txData);
      if (txs && txs?.txid) {
        const res = await updateTxById(record.id, 3, txs.txid);
        if (res.success) {
          showMsg("success", "Operation succeeded!");
          triggerRefresh();
        } else {
          showMsg("error", res.error?.message);
        }
      }
    });
  }

  // 发送
  const onSend = async (record: DataType) => {
    if (user?.address.toLowerCase() !== executor.toLowerCase()) {
      showMsg('warning', 'Current account has no permission')
      return
    }
    if(!tx) return
    await withLoading(record, setSendLoading, async () => {
      const txData = buildTxData(record);
      const txs = await tx.sendTransaction(txData);
      if (txs && txs?.txid) {
        const res = await updateTxById(record.id, txs.status, txs.txid);
        if (res.success) {
          showMsg("success", "Successfully sent!");
          triggerRefresh();
        } else {
          showMsg("error", res.error?.message || "Fail in send");
        }
      }
    });
  }

  //签名按钮状态
  const canSign = (record: DataType) => {
    if(!user?.address) return true
    if (record.status === 1 && ownerList.includes(user?.address) && record.creator.toLowerCase() !== user?.address.toLowerCase()) {
      return false;
    }
    return true;
  };

  //发送按钮状态
  const canSend = (record: DataType): boolean => {
    if (!user?.address) return false;
    return (
      record.status === 3 &&
      user.address.toLowerCase() === executor.toLowerCase()
    );
  };

  //删除按钮状态
  const canDelete = (record: DataType) => !(record.status === 1 && user?.address.toLowerCase() === record.creator.toLowerCase())

  //删除
  const deleteFun = async (record: DataType) => {
    if (!user?.address || !record.id) return
    const res = await delTxId(record.id)
    if (res.success) {
      showMsg('success', 'Successfully deleted')
      triggerRefresh()
    } else {
      showMsg('error', res.error?.message ?? 'Delete failed')
    }
  }

  //表格字段绑定
  const columns: ColumnsType<DataType> = [
    { title: "ID", dataIndex: "id", key: "id", width: 60},
    {
      title: "Creator Address",
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
    {
      title: "Receiver",
      dataIndex: "receiver",
      key: "receiver",
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Copyable value={text} display={shortenString(text, 4, 10)} />
        </Tooltip>
      ),
    },
    { title: "Create Type", dataIndex: "createType", key: "createType", width: 90},
    {
      title: "Address",
      dataIndex: "to",
      key: "to",
      width: 160,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Copyable value={text} display={shortenString(text, 4, 10)} />
        </Tooltip>
      ),
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
      title: "Creation time",
      dataIndex: "createdAtFormatted",
      key: "createdAtFormatted",
      width: 140,
    },
    {
      title: "State",
      dataIndex: "status",
      key: "status",
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
      },
    },
    {
      title: "Operation",
      key: "action",
      width: 120,
      render: (_, record) => (
        <Space wrap>
          {
            !canSign(record) ? 
              <Button
              size="small"
              icon={<SendOutlined />}
              loading={signLoading[record.id]}
              onClick={() => onSign(record)}>
              Signature
            </Button> : null
          }
          { 
            canSend(record) ? 
              <Button
              size="small"
              type="primary"
              icon={<EditOutlined />}
              loading={sendLoading[record.id]}
              onClick={() => onSend(record)}>
              Send
            </Button> : null
          }
          {
            !canDelete(record) ?
            <Popconfirm
              title="Delete prompt"
              description="Are you sure you want to delete?"
              onConfirm={() => deleteFun(record)}
              okText="confirm"
              cancelText="cancel">
              <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm> : null
          }
        </Space>
      ),
    },
  ];

  return (
    <Table<DataType>
      rowKey="id"
      size="middle"
      columns={columns}
      dataSource={processedData}
      loading={loading}
      tableLayout="fixed"
      sticky
      scroll={{ x: 1000, y: 480 }}
      locale={{ emptyText: <Empty description="No data temporarily" /> }}
      pagination={{
        current: page.current,
        pageSize: page.pageSize,
        total: page.total,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
    />
  );
};

export default TransactionTable;
