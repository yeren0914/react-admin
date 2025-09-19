import Tx from "./index";
let txInstance: Tx | null = null;

export const getTx = async (): Promise<Tx> => {
  if (!txInstance) {
    txInstance = new Tx();
  }
  return txInstance;
};