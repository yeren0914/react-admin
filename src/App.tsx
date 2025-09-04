
import { ConfigProvider } from 'antd';
import AppRouter from "./router/index";
import { MessageProvider} from './components/MessageProvider';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#00b96b',
        },
      }}
    >
      <MessageProvider>
        <AppRouter />
      </MessageProvider>
    </ConfigProvider>
  );
}

export default App