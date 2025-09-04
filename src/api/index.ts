import { get } from '../utils/http'

export const getBalance = async (address: string) => {
    return get('/getBalance', { address });
}