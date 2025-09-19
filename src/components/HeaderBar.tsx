import React, { useEffect } from "react";
import { Button, Space, Typography } from "antd";
import { SendOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import { useMessageApi } from "../components/MessageProvider";
import { signLogin } from "../utils/sign";
import { login } from "../api/index";
import { shortenString } from "../utils/utils";
import { useTx } from '../hooks/useTx'
import KasplexIcon from '../assets/kasplex.ico'

const { Text } = Typography;

const HeaderBar: React.FC = () => {
  const { loginHooks, logoutHooks, user, triggerRefresh } = useAuth();
  const hydrate = useAuth((s) => s.hydrate);
  const showMsg = useMessageApi();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const { ensureWallet } = useTx();

  const loginFun = async () => {
    const instance = await ensureWallet();
    if (!instance || !instance.signer || !instance.address) {
      showMsg("error", "Wallet not connected");
      return;
    }
    const time = new Date().toISOString();
    if (!instance.address) await instance.connectWallet();
    const signer = instance.signer;
    if (signer && instance.address) {
      try {
        setLoading(true);
        const signature = await signLogin(signer, { address: instance.address, login_at: time });
        const res = await login(instance.address, time, signature);
        if (res.error?.message) { showMsg("error", res.error.message!); return; }
        if (res.data?.token) {
          showMsg("success", "Login succeeded");
          loginHooks(res.data.token, { address: instance.address });
          triggerRefresh();
        }
      } catch {
        showMsg("error", "Login failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const logoutFun = () => {
    logoutHooks();
    triggerRefresh()
    showMsg("success", "Logged out");
  };

  return (
    <div className="app-header">
      <div className="app-header-inner">
        <Space size={10} align="center">
          <img className="logo" src={KasplexIcon } alt="" />
          <Text strong style={{ color: "#e2e8f0", marginLeft: 4 }}>Multi-Sign</Text>
        </Space>

        {user?.address ? (
          <Space size="large" align="center">
            <span className="header-addr">{shortenString(user.address, 6, 6)}</span>
            <Button danger type="primary" icon={<LogoutOutlined />} onClick={logoutFun}>
              Log out
            </Button>
          </Space>
        ) : (
          <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={loginFun}>
            Login
          </Button>
        )}
      </div>
    </div>
  );
};

export default HeaderBar;
