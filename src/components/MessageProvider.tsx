import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type { NoticeType } from "antd/es/message/interface";
import { message } from 'antd';

type MessageContextType = {
  showMsg: (type?: NoticeType, content?: string) => void;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessageApi = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageApi must be used within a MessageProvider');
  }
  return context.showMsg;
};

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage();

  const showMsg = useCallback(
    (type: NoticeType = 'success', content = '') => {
      messageApi.destroy();
      messageApi.open({ type, content });
    },
    [messageApi]
  );

  const memoizedValue = useMemo(() => ({ showMsg }), [showMsg]);

  return (
    <MessageContext.Provider value={memoizedValue}>
      {contextHolder}
      {children}
    </MessageContext.Provider>
  );
};
