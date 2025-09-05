
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