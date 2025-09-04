export interface RequestParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ErrorResponse {
  message?: string;
}