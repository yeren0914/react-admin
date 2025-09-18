import React from "react";
import { Space, Tooltip, Button, Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useMessageApi } from "./MessageProvider";

const { Text } = Typography;

type Props = { value: string; display: string };

const Copyable: React.FC<Props> = ({ value, display }) => {
  const showMsg = useMessageApi();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      showMsg("success", "Copy succeeded");
    } catch {
      showMsg("error", "copy failed");
    }
  };

  return (
    <Space size={6}>
      <Text ellipsis style={{ maxWidth: 220 }}>{display}</Text>
      <Tooltip placement="right" title="copy">
        <Button
          size="small"
          type="text"
          aria-label="copy"
          icon={<CopyOutlined />}
          onClick={onCopy}
        />
      </Tooltip>
    </Space>
  );
};

export default Copyable;
