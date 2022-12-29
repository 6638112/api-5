import { Injectable } from '@nestjs/common';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { SellLiquidityStrategyAlias } from '../sell-liquidity.facade';
import { EvmTokenStrategy } from './base/evm-token.strategy';

@Injectable()
export class OptimismTokenStrategy extends EvmTokenStrategy {
  constructor(protected readonly assetService: AssetService) {
    super(SellLiquidityStrategyAlias.OPTIMISM_TOKEN);
  }

  sellLiquidity(): Promise<void> {
    throw new Error('Selling liquidity on DEX is not supported for Optimism token');
  }

  addSellData(): Promise<void> {
    throw new Error('Selling liquidity on DEX is not supported for Optimism token');
  }

  protected getFeeAsset(): Promise<Asset> {
    return this.assetService.getOptimismCoin();
  }
}