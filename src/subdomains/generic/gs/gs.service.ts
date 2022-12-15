import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CryptoInputService } from 'src/mix/models/crypto-input/crypto-input.service';
import { CryptoStakingService } from 'src/mix/models/crypto-staking/crypto-staking.service';
import { StakingRefRewardService } from 'src/mix/models/staking-ref-reward/staking-ref-reward.service';
import { StakingRewardService } from 'src/mix/models/staking-reward/staking-reward.service';
import { BuyCryptoService } from 'src/subdomains/core/buy-crypto/process/services/buy-crypto.service';
import { BuyService } from 'src/subdomains/core/buy-crypto/route/buy.service';
import { RefRewardService } from 'src/subdomains/core/referral/reward/ref-reward.service';
import { BuyFiatService } from 'src/subdomains/core/sell-crypto/buy-fiat/buy-fiat.service';
import { SellService } from 'src/subdomains/core/sell-crypto/sell/sell.service';
import { BankAccountService } from 'src/subdomains/supporting/bank/bank-account/bank-account.service';
import { BankTxType } from 'src/subdomains/supporting/bank/bank-tx/bank-tx.entity';
import { getConnection } from 'typeorm';
import { UserData } from '../user/models/user-data/user-data.entity';
import { UserDataService } from '../user/models/user-data/user-data.service';
import { UserService } from '../user/models/user/user.service';
import { DbQueryBaseDto, DbQueryDto } from './dto/db-query.dto';
import { SupportDataQuery, SupportReturnData } from './dto/support-data.dto';

@Injectable()
export class GsService {
  constructor(
    private readonly userDataService: UserDataService,
    private readonly userService: UserService,
    private readonly buyService: BuyService,
    private readonly sellService: SellService,
    private readonly bankAccountService: BankAccountService,
    private readonly buyCryptoService: BuyCryptoService,
    private readonly cryptoStakingService: CryptoStakingService,
    private readonly stakingRewardService: StakingRewardService,
    private readonly stakingRefRewardService: StakingRefRewardService,
    private readonly cryptoInputService: CryptoInputService,
    private readonly buyFiatService: BuyFiatService,
    private readonly refRewardService: RefRewardService,
  ) {}

  async getRawData(query: DbQueryDto): Promise<any> {
    const request = getConnection()
      .createQueryBuilder()
      .from(query.table, query.table)
      .orderBy(`${query.table}.id`, query.sorting)
      .take(query.maxLine)
      .where(`${query.table}.id >= :id`, { id: query.min })
      .andWhere(`${query.table}.updated >= :updated`, { updated: query.updatedSince });

    if (query.select) request.select(query.select);

    for (const where of query.where) {
      request.andWhere(where[0], where[1]);
    }

    for (const join of query.join) {
      request.leftJoin(join[0], join[1]);
    }

    const data = await request.getRawMany().catch((e: Error) => {
      throw new BadRequestException(e.message);
    });

    // transform to array
    return this.transformResultArray(data, query.table);
  }

  async getExtendedData(query: DbQueryBaseDto): Promise<{
    keys: string[];
    values: any;
  }> {
    switch (query.table) {
      case 'bank_tx':
        return this.transformResultArray(await this.getExtendedBankTxData(query), query.table);
    }
  }

  async getSupportData(query: SupportDataQuery): Promise<SupportReturnData> {
    const userData = await this.getUserData(query);
    if (!userData) throw new NotFoundException('User data not found');

    const userIds = userData.users.map((u) => u.id);
    const refCodes = userData.users.map((u) => u.ref);

    return {
      buyCrypto: await this.buyCryptoService.getAllUserTransactions(userIds),
      buyFiat: await this.buyFiatService.getAllUserTransactions(userIds),
      ref: await this.buyCryptoService.getAllRefTransactions(refCodes),
      refReward: await this.refRewardService.getAllUserRewards(userIds),
      staking: await this.cryptoStakingService.getUserTransactions(userIds),
      stakingReward: await this.stakingRewardService.getAllUserRewards(userIds),
      stakingRefReward: await this.stakingRefRewardService.getAllUserRewards(userIds),
      cryptoInput: await this.cryptoInputService.getAllUserTransactions(userIds),
    };
  }

  //*** HELPER METHODS ***//

  private async getUserData(query: SupportDataQuery): Promise<UserData> {
    if (query.userDataId) {
      return await this.userDataService.getUserData(+query.userDataId);
    } else if (query.userAddress) {
      return await this.userService.getUserByAddress(query.userAddress).then((user) => user?.userData);
    } else if (query.depositAddress) {
      return await this.sellService.getSellByAddress(query.depositAddress).then((sell) => sell?.user.userData);
    } else if (query.iban) {
      return await this.bankAccountService.getBankAccountByIban(query.iban).then((bankAcc) => bankAcc?.user.userData);
    } else if (query.ref) {
      return await this.userService.getRefUser(query.ref).then((user) => user?.userData);
    } else if (query.bankUsage) {
      return await this.buyService.getBuyByBankUsage(query.bankUsage).then((buy) => buy?.user.userData);
    }
  }

  private async getExtendedBankTxData(dbQuery: DbQueryBaseDto): Promise<any[]> {
    const select = dbQuery.select ? dbQuery.select.map((e) => dbQuery.table + '.' + e).join(',') : dbQuery.table;

    const buyCryptoData = await getConnection()
      .createQueryBuilder()
      .from(dbQuery.table, dbQuery.table)
      .select(select)
      .addSelect('userData.id', 'userDataId')
      .leftJoin('bank_tx.buyCrypto', 'buyCrypto')
      .leftJoin('buyCrypto.buy', 'buy')
      .leftJoin('buy.user', 'user')
      .leftJoin('user.userData', 'userData')
      .where('bank_tx.id >= :id', { id: dbQuery.min })
      .andWhere('bank_tx.updated >= :updated', { updated: dbQuery.updatedSince })
      .andWhere('bank_tx.type = :type', { type: BankTxType.BUY_CRYPTO })
      .orderBy('bank_tx.id', dbQuery.sorting)
      .take(dbQuery.maxLine)
      .getRawMany()
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      });

    const buyFiatData = await getConnection()
      .createQueryBuilder()
      .from(dbQuery.table, dbQuery.table)
      .select(select)
      .addSelect('userData.id', 'userDataId')
      .leftJoin('bank_tx.buyFiat', 'buyFiat')
      .leftJoin('buyFiat.sell', 'sell')
      .leftJoin('sell.user', 'user')
      .leftJoin('user.userData', 'userData')
      .where('bank_tx.id >= :id', { id: dbQuery.min })
      .andWhere('bank_tx.updated >= :updated', { updated: dbQuery.updatedSince })
      .andWhere('bank_tx.type = :type', { type: BankTxType.BUY_FIAT })
      .orderBy('bank_tx.id', dbQuery.sorting)
      .take(dbQuery.maxLine)
      .getRawMany()
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      });

    const bankTxRestData = await getConnection()
      .createQueryBuilder()
      .from(dbQuery.table, dbQuery.table)
      .select(select)
      .addSelect('userData.id', 'userDataId')
      .leftJoin('bank_tx.buyFiat', 'buyFiat')
      .leftJoin('buyFiat.sell', 'sell')
      .leftJoin('sell.user', 'user')
      .leftJoin('user.userData', 'userData')
      .where('bank_tx.id >= :id', { id: dbQuery.min })
      .andWhere('bank_tx.updated >= :updated', { updated: dbQuery.updatedSince })
      .andWhere('(bank_tx.type IS NULL OR bank_tx.type NOT IN (:crypto, :fiat))', {
        crypto: BankTxType.BUY_CRYPTO,
        fiat: BankTxType.BUY_FIAT,
      })
      .orderBy('bank_tx.id', dbQuery.sorting)
      .take(dbQuery.maxLine)
      .getRawMany()
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      });

    return buyCryptoData
      .concat(buyFiatData, bankTxRestData)
      .sort((a, b) => (dbQuery.sorting == 'ASC' ? a.bank_tx_id - b.bank_tx_id : b.bank_tx_id - a.bank_tx_id));
  }

  private transformResultArray(
    data: any[],
    table: string,
  ): {
    keys: string[];
    values: any;
  } {
    // transform to array
    return data.length > 0
      ? {
          keys: this.renameDbKeys(table, Object.keys(data[0])),
          values: data.map((e) => Object.values(e)),
        }
      : undefined;
  }

  private renameDbKeys(table: string, keys: string[]): string[] {
    return keys.map((k) => k.replace(`${table}_`, '')).map((k) => (k.includes('_') ? this.toDotSeparation(k) : k));
  }

  private toDotSeparation(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).split('_').join('.');
  }
}