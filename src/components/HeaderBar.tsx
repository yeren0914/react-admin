import React, { useEffect } from "react";
import { Button, Space, Typography } from "antd";
import { SendOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import { useMessageApi } from "../components/MessageProvider";
import { signLogin } from "../utils/sign";
import { login } from "../api/index";
import { shortenString } from "../utils/utils";
import { useTx } from '../hooks/useTx'

const { Text } = Typography;

const HeaderBar: React.FC = () => {
  const { loginHooks, logoutHooks, user, triggerRefresh } = useAuth();
  const hydrate = useAuth((s) => s.hydrate);
  const showMsg = useMessageApi();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { tx } = useTx();

  // 登录
  const loginFun = async () => {
    if (!tx) return; 
    const time = new Date().toISOString();
    if (!tx.address) {
      await tx.connectWallet();
    }
    const signer = tx.signer;
    if (signer && tx.address) {
      try {
        setLoading(true);
        const signature = await signLogin(signer, {
          address: tx.address,
          login_at: time,
        });

        const res = await login(tx.address, time, signature);
        if (res.error && res.error.message) {
          showMsg("error", res.error.message!);
          return;
        }
        if (res.data && res.data.token) {
          showMsg("success", "Login succeeded");
          loginHooks(res.data.token, { address: tx.address });
          triggerRefresh()
        }
      } catch (error) {
        showMsg("error", "Login failed");
        console.log('error', error)
      } finally {
        setLoading(false);
      }
    }
  };

  // 退出登录
  const logoutFun = () => {
    logoutHooks();
    showMsg("success", "Logged out");
  };

  return (
    <div
      style={{
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        height: 55,
        borderBottom: "1px solid #eee",
      }}
    >
      {user?.address ? (
        <Space size="large">
          <Text strong>{shortenString(user.address, 6, 6)}</Text>
          <Button
            danger
            type="primary"
            icon={<LogoutOutlined />}
            onClick={logoutFun}
          >
            Log out
          </Button>
        </Space>
      ) : (
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={loginFun}
        >
          Login
        </Button>
      )}
    </div>
  );
};

export default HeaderBar;
