import { Body, Controller, Get, Put, UseGuards, Post, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { SellService } from './sell.service';
import { CreateSellDto } from './dto/create-sell.dto';
import { UpdateSellDto } from './dto/update-sell.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { UserRole } from 'src/shared/auth/user-role.enum';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { SellDto } from './dto/sell.dto';
import { Sell } from './sell.entity';
import { UserService } from 'src/subdomains/generic/user/models/user/user.service';
import { BuyFiatService } from '../buy-fiat/buy-fiat.service';
import { SellHistoryDto } from './dto/sell-history.dto';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/utils/util';
import { GetSellPaymentInfoDto } from './dto/get-sell-payment-info.dto';
import { SellPaymentInfoDto } from './dto/sell-payment-info.dto';
import { MinDeposit } from '../../../../mix/models/deposit/dto/min-deposit.dto';
import { Asset, AssetCategory } from 'src/shared/models/asset/asset.entity';
import { AssetService } from 'src/shared/models/asset/asset.service';

@ApiTags('sell')
@Controller('sell')
export class SellController {
  constructor(
    private readonly sellService: SellService,
    private readonly userService: UserService,
    private readonly buyFiatService: BuyFiatService,
    private readonly assetService: AssetService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async getAllSell(@GetJwt() jwt: JwtPayload): Promise<SellDto[]> {
    return this.sellService.getUserSells(jwt.id).then((l) => this.toDtoList(jwt.id, l));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async createSell(@GetJwt() jwt: JwtPayload, @Body() dto: CreateSellDto): Promise<SellDto> {
    return this.sellService.createSell(jwt.id, dto).then((s) => this.toDto(jwt.id, s));
  }

  @Put('/paymentInfos')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  @ApiResponse({ status: 200, type: SellPaymentInfoDto })
  async createSellWithPaymentInfo(
    @GetJwt() jwt: JwtPayload,
    @Body() dto: GetSellPaymentInfoDto,
  ): Promise<SellPaymentInfoDto> {
    return this.sellService
      .createSell(jwt.id, { ...dto, fiat: dto.currency }, true)
      .then((sell) => this.toPaymentInfoDto(jwt.id, sell, dto));
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async updateSell(@GetJwt() jwt: JwtPayload, @Param('id') id: string, @Body() dto: UpdateSellDto): Promise<SellDto> {
    return this.sellService.updateSell(jwt.id, +id, dto).then((s) => this.toDto(jwt.id, s));
  }

  @Get(':id/history')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(UserRole.USER))
  async getSellRouteHistory(@GetJwt() jwt: JwtPayload, @Param('id') id: string): Promise<SellHistoryDto[]> {
    return this.buyFiatService.getSellHistory(jwt.id, +id);
  }

  // --- DTO --- //
  private async toDtoList(userId: number, sell: Sell[]): Promise<SellDto[]> {
    const sellDepositsInUse = await this.sellService.getUserSellDepositsInUse(userId);
    const fee = await this.getFee(userId);

    return Promise.all(sell.map((s) => this.toDto(userId, s, sellDepositsInUse, fee)));
  }

  private async toDto(userId: number, sell: Sell, sellDepositsInUse?: number[], fee?: number): Promise<SellDto> {
    sellDepositsInUse ??= await this.sellService.getUserSellDepositsInUse(userId);
    fee ??= await this.getFee(userId);

    return {
      ...sell,
      fee,
      blockchain: sell.deposit.blockchain,
      isInUse: sellDepositsInUse.includes(sell.deposit.id),
      minDeposits: this.getMinDeposit(sell.fiat.name),
    };
  }

  private async toPaymentInfoDto(userId: number, sell: Sell, dto: GetSellPaymentInfoDto): Promise<SellPaymentInfoDto> {
    return {
      fee: await this.getFee(userId, dto.asset),
      depositAddress: sell.deposit.address,
      blockchain: sell.deposit.blockchain,
      minDeposits: this.getMinDeposit(sell.fiat.name),
    };
  }

  // --- HELPER-METHODS --- //
  async getFee(userId: number, asset?: Asset): Promise<number> {
    if (asset) {
      asset = await this.assetService.getAssetById(asset.id);
      if (asset?.category === AssetCategory.STOCK) return 0;
    }
    return this.userService.getUserSellFee(userId);
  }

  private getMinDeposit(outputAsset: string): MinDeposit[] {
    const minVolume = Object.entries(Config.blockchain.default.minTransactionVolume)
      .filter(([key, _]) => key === outputAsset)
      .map(([_, value]) => value);

    return Util.transformToMinDeposit(minVolume[0] ?? Config.blockchain.default.minTransactionVolume.default);
  }
}