import { Asset } from 'src/shared/models/asset/asset.entity';
import { EvmClient } from '../shared/evm/evm-client';

export class OptimismClient extends EvmClient {
  constructor(
    gatewayUrl: string,
    privateKey: string,
    dfxAddress: string,
    swapContractAddress: string,
    swapTokenAddress: string,
  ) {
    super(gatewayUrl, privateKey, dfxAddress, swapContractAddress, swapTokenAddress);
  }

  /**
   * @note
   * defaulting to 0 until solution for fetching Optimism tx fees is implemented
   */
  async getTxActualFee(_txHash: string): Promise<number> {
    return 0;
  }

  /**
   * @note
   * requires UniswapV3 implementation or alternative
   */
  async nativeCryptoTestSwap(_nativeCryptoAmount: number, _targetToken: Asset): Promise<number> {
    throw new Error('nativeCryptoTestSwap is not implemented for Optimism blockchain');
  }
}