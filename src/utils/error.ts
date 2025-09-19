type ErrorType = keyof typeof errorMap;

const errorMap = {
  'no-wallet': 'Please install MetaMask',
  'sign-failed': 'Signature verification failed',
  'sign-address-failed': 'Signature verification failed: address mismatch',
  'params-error': 'Transaction parameter generation failed',
  'function-code-error': 'Failed to encode function data',
  'addOwner-error': 'Failed to create AddOwner transaction',
  'removeOwber-error': 'Failed to create removeOwner transaction',
  'multi-sign-error': 'Failed to execute multi sign transaction',
  'time-lock-error': 'Failed to create timeLock transaction',
  'multisign': 'MultiSign transaction execution failed',
  'timelock': 'Timelock transaction execution failed',
} as const;

export function errorMsg(error: unknown, type: ErrorType): string {
  const defaultMsg = errorMap[type] ?? 'unknown error';
  const rejectMsg = 'User rejected the request';
  const msg =
    error instanceof Error ? error.message :
    typeof error === 'string' ? error :
    '';

  if (msg && msg.includes(rejectMsg)) {
    return rejectMsg;
  }

  return defaultMsg;
}