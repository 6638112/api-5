import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoRouteRepository } from 'src/subdomains/core/buy-crypto/routes/crypto-route/crypto-route.repository';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/subdomains/generic/user/user.module';
import { BankModule } from 'src/subdomains/supporting/bank/bank.module';
import { DexModule } from 'src/subdomains/supporting/dex/dex.module';
import { NotificationModule } from 'src/subdomains/supporting/notification/notification.module';
import { PayInModule } from 'src/subdomains/supporting/payin/payin.module';
import { PayoutModule } from 'src/subdomains/supporting/payout/payout.module';
import { PricingModule } from 'src/subdomains/supporting/pricing/pricing.module';
import { SellCryptoModule } from '../sell-crypto/sell-crypto.module';
import { BuyCryptoController } from './process/buy-crypto.controller';
import { BuyCryptoBatchRepository } from './process/repositories/buy-crypto-batch.repository';
import { BuyCryptoRepository } from './process/repositories/buy-crypto.repository';
import { BuyCryptoBatchService } from './process/services/buy-crypto-batch.service';
import { BuyCryptoDexService } from './process/services/buy-crypto-dex.service';
import { BuyCryptoNotificationService } from './process/services/buy-crypto-notification.service';
import { BuyCryptoOutService } from './process/services/buy-crypto-out.service';
import { BuyCryptoPricingService } from './process/services/buy-crypto-pricing.service';
import { BuyCryptoRegistrationService } from './process/services/buy-crypto-registration.service';
import { BuyCryptoService } from './process/services/buy-crypto.service';
import { CryptoRouteController } from './routes/crypto-route/crypto-route.controller';
import { BuyRepository } from './routes/buy/buy.repository';
import { BuyController } from './routes/buy/buy.controller';
import { CryptoRouteService } from './routes/crypto-route/crypto-route.service';
import { BuyService } from './routes/buy/buy.service';
import { AddressPoolModule } from 'src/subdomains/supporting/address-pool/address-pool.module';
import { AinModule } from 'src/integration/blockchain/ain/ain.module';
import { BuyCryptoBatch } from './process/entities/buy-crypto-batch.entity';
import { BuyCrypto } from './process/entities/buy-crypto.entity';
import { Buy } from './routes/buy/buy.entity';
import { CryptoRoute } from './routes/crypto-route/crypto-route.entity';
import { BuyCryptoFee } from './process/entities/buy-crypto-fees.entity';
import { PaymentModule } from 'src/shared/payment/payment.module';
import { LiquidityManagementModule } from '../liquidity-management/liquidity-management.module';
import { BuyCryptoInitSpecification } from './process/specifications/buy-crypto-init.specification';

@Module({
  imports: [
    TypeOrmModule.forFeature([BuyCrypto, BuyCryptoBatch, BuyCryptoFee, Buy, CryptoRoute]),
    SharedModule,
    DexModule,
    PricingModule,
    PayInModule,
    PayoutModule,
    NotificationModule,
    UserModule,
    BankModule,
    AinModule,
    PaymentModule,
    forwardRef(() => SellCryptoModule),
    forwardRef(() => AddressPoolModule),
    LiquidityManagementModule,
  ],
  controllers: [BuyCryptoController, BuyController, CryptoRouteController],
  providers: [
    BuyCryptoRepository,
    BuyCryptoBatchRepository,
    BuyRepository,
    CryptoRouteRepository,
    CryptoRouteController,
    BuyController,
    BuyCryptoService,
    BuyCryptoBatchService,
    BuyCryptoDexService,
    BuyCryptoPricingService,
    BuyCryptoRegistrationService,
    BuyCryptoNotificationService,
    BuyCryptoOutService,
    BuyService,
    CryptoRouteService,
    BuyCryptoInitSpecification,
  ],
  exports: [BuyController, CryptoRouteController, BuyCryptoService, BuyService],
})
export class BuyCryptoModule {}
