import type { Signer, TypedDataDomain, TypedDataField } from 'ethers';


const domain: TypedDataDomain = {
  name: 'Login',
  version: '1',
  chainId: 1337,
  verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
};

const types: Record<string, TypedDataField[]> = {
  Login: [
    { name: 'address', type: 'address' },
    { name: 'login_at', type: 'string' },
  ],
};

type StructToType<T extends readonly TypedDataField[]> = {
  [P in T[number]as P["name"]]: P["type"] extends "address" | "string"
  ? string
  : unknown;
};

export type ValueFor<TTypes extends Record<string, readonly TypedDataField[]>> = {
  [K in keyof TTypes]: StructToType<TTypes[K]>;
}[keyof TTypes];

export type LoginValue = ValueFor<typeof types>;
export interface TypedDataSigner extends Signer {
  _signTypedData<
    TTypes extends Record<string, readonly TypedDataField[]>,
    TValue extends ValueFor<TTypes>
  >(
    domain: TypedDataDomain,
    types: TTypes,
    value: TValue
  ): Promise<string>;
}


export function signLogin(
  signer: Signer,
  value: LoginValue,
  params: Partial<TypedDataDomain> = {}
): Promise<string> {
  const typedSigner = signer as unknown as TypedDataSigner;
  return typedSigner._signTypedData(
    { ...domain, ...params },
    types,
    value
  );
}