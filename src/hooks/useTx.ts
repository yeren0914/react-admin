import { useEffect, useState } from "react";
import { getTx } from "../wallet/singleton";
import Tx from "../wallet/index";

export const useTx = (): { tx: Tx | null; loading: boolean } => {
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const instance = await getTx();
        if (mounted) setTx(instance);
      } catch (err) {
        console.error("Tx initialization failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { tx, loading };
};
