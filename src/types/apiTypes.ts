
export interface ApiError {
  code: number;
  message: string;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  error?: ApiError;
}

export interface ApiResponseWithSuccess<T> extends ApiResponse<T> {
  success: boolean;
}

//登录
export interface LoginData {
  token: string;
}
export type LoginResponse = ApiResponse<LoginData>;

//交易列表
export interface ApiTxListData {
  rows: Array<unknown>;
  total: number;
}
export type ApiTxResponse = ApiResponseWithSuccess<ApiTxListData>;


export interface UpdateData {
  id: string;
  status: number;
  txid: string;
}