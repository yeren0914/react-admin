import type { RuleObject } from "antd/es/form";

// 字符串截取
export function cutString(str: string, len: number) {
  if (str.length <= len) {
    return str;
  }
  return str.substring(0, len) + "...";
}

// 短地址
export function shortenString(str: string, front: number = 6, back: number = 16): string {
  if (!str) return "";
  if (str.length <= front + back) return str;
  return `${str.slice(0, front)}......${str.slice(-back)}`;
}

// 等待时间
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//校验ETH地址
export const validateEthAddress = (_rule: RuleObject, value: string): Promise<void> => {
  if (!value) {
    return Promise.reject("Address cannot be empty");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return Promise.reject("The address format is incorrect");
  }
  return Promise.resolve();
};

/**
 * 格式化时间
 * @param dateStr ISO 或 时间戳字符串
 * @returns yyyy-MM-dd HH:mm:ss
 */
export function formatDateTime(
  input: string | number | Date | null | undefined,
  options?: { timeZone?: string; locale?: string }
): string {
  if (input === null || input === undefined || input === "") return "-";

  const timeZone = options?.timeZone ?? "Asia/Tokyo";
  const locale = options?.locale ?? "zh-CN";
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input;

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return String(input);
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      partMap[p.type] = p.value;
    }
  }

  const year = partMap.year ?? String(date.getFullYear()).padStart(4, "0");
  const month = partMap.month ?? String(date.getMonth() + 1).padStart(2, "0");
  const day = partMap.day ?? String(date.getDate()).padStart(2, "0");
  const hour = partMap.hour ?? String(date.getHours()).padStart(2, "0");
  const minute = partMap.minute ?? String(date.getMinutes()).padStart(2, "0");
  const second = partMap.second ?? String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

