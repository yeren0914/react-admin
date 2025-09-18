import Tx from "./index";

let txInstance: Tx | null = null;
let txInitPromise: Promise<Tx> | null = null;

export const getTx = async (): Promise<Tx> => {
  if (txInstance) return txInstance;

  if (!txInitPromise) {
    txInitPromise = (async () => {
      const instance = new Tx();
      await instance.connectWallet();
      txInstance = instance;
      return instance;
    })();
  }

  return txInitPromise;
};
