import React, { useState, useEffect } from "react";
import { Input, Button, Select, Form } from "antd";
import type { CreateParams } from "../types/types";
import { TransactionType } from "../utils/constants";
import { validateEthAddress } from "../utils/utils";
import { useMessageApi } from "../components/MessageProvider";
import { createTx } from "../api/index";
import { useAuth } from "../hooks/useAuth";
import { useTx } from '../hooks/useTx'

type Props = {
  txType: number;
  setTxType: (v: number) => void;
  createParams: CreateParams;
  setCreateParams: (p: CreateParams) => void;
};

const TransactionForm: React.FC<Props> = ({ txType, setTxType, setCreateParams }) => {
  const [form] = Form.useForm();
  const [btnLoading, setBtnLoading] = useState(false);
  const { triggerRefresh, user } = useAuth();
  const showMsg = useMessageApi();
  const { tx } = useTx();

  useEffect(() => {
    if (!txType && TransactionType.length > 0) {
      const firstType = TransactionType[0].value;
      setTxType(firstType);
      form.setFieldsValue({ type: firstType });
    }
  }, [txType, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createTxFun(values)
    } catch {
      // 校验失败
    }
  };

  const createTxFun = async (createParams: CreateParams) => {
    try {
      if (!user?.address) { showMsg('error', 'Please login first'); return }
      if (!tx || !tx.address) await tx!.connectWallet();
      const address = createParams.toAddress || createParams.removeAddress
      const isReceiver = await tx!.isReceiver(address!)
      if (isReceiver) {
        showMsg('error', 'This address is already a receiver')
        return
      }
      setBtnLoading(true)
      if (window.ethereum) {
        const getParams = await tx!.createTransaction(createParams)
        if (getParams) {
          const params = { to: getParams.to, data: getParams.data, value: 0, nonce: getParams.nonce, signature: getParams.signature }
          const res = await createTx(params.to, params.data, params.value.toString(), Number(params.nonce), params.signature)
          if (res.success) { showMsg('success', 'Create transaction success'); triggerRefresh() }
          else { showMsg('error', res.error?.message || 'Create transaction failed') }
        }
      }
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Create transaction failed'
      showMsg('error', msg)
    } finally { setBtnLoading(false) }
  }

  return (
    <Form
      form={form}
      layout="inline"
      className="tx-form"
      initialValues={{ type: txType || TransactionType[0].value }}
      onValuesChange={(_, all) => setCreateParams(all as CreateParams)}
    >
      <Form.Item name="type">
        <Select style={{ width: 200 }} placeholder="Select Transaction Type" onChange={(v) => setTxType(v)}>
          {TransactionType.map((item) => (
            <Select.Option key={item.value} value={item.value}>{item.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      {txType === 1 && (
        <Form.Item name="toAddress" rules={[{ validator: validateEthAddress }]}>
          <Input placeholder="Please enter the receiving address" style={{ width: 300 }} />
        </Form.Item>
      )}

      {txType === 2 && (
        <Form.Item name="removeAddress" rules={[{ validator: validateEthAddress }]}>
          <Input placeholder="Please enter the removal address" style={{ width: 300 }} />
        </Form.Item>
      )}

      {txType === 3 && (
        <>
          <Form.Item name="toAddress" rules={[{ validator: validateEthAddress }]}>
            <Input placeholder="Please enter the new address" style={{ width: 260 }}  />
          </Form.Item>
          <Form.Item name="threshold" rules={[{ required: true, message: "Please enter threshold" }]}>
            <Input type="number" placeholder="Please enter threshold" style={{ width: 140 }}  />
          </Form.Item>
        </>
      )}

      {txType === 4 && (
        <>
          <Form.Item name="removeAddress" rules={[{ validator: validateEthAddress }]}>
            <Input placeholder="Please enter the address" style={{ width: 260 }}  />
          </Form.Item>
          <Form.Item name="threshold" rules={[{ required: true, message: "Please enter threshold" }]}>
            <Input type="number" min="0" placeholder="Please enter threshold" style={{ width: 140 }}  />
          </Form.Item>
        </>
      )}

      {txType === 5 && (
        <>
          <Form.Item name="oldAddress" rules={[{ validator: validateEthAddress }]}>
            <Input placeholder="Please enter the old address" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="newAddress" rules={[{ validator: validateEthAddress }]}>
            <Input placeholder="Please enter a new address" style={{ width: 260 }} />
          </Form.Item>
        </>
      )}

      <Form.Item>
        <Button type="primary" loading={btnLoading} onClick={handleSubmit}>
          Submit Transaction
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TransactionForm;
