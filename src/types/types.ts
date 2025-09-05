export interface RequestParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ErrorResponse {
  message?: string;
}

export interface DataType {
  id: string;
  address: string;
  amount: number;
  sign: string;
  hash: string;
  status: "pending" | "success" | "failed";
}