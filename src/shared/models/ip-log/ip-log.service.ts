import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { GeoLocationService } from 'src/integration/geolocation/geo-location.service';
import { UserRole } from 'src/shared/auth/user-role.enum';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { CountryService } from '../country/country.service';
import { IpLog } from './ip-log.entity';
import { IpLogRepository } from './ip-log.repository';

@Injectable()
export class IpLogService {
  constructor(
    private readonly geoLocationService: GeoLocationService,
    private readonly countryService: CountryService,
    private readonly ipLogRepo: IpLogRepository,
    private readonly repos: RepositoryFactory,
  ) {}

  async create(ip: string, url: string, address: string): Promise<IpLog> {
    const { country, result } = await this.checkIpCountry(ip, address);
    const ipLog = this.ipLogRepo.create({
      ip,
      country,
      result,
      url,
      address,
    });

    return this.ipLogRepo.save(ipLog);
  }

  private async checkIpCountry(userIp: string, address: string): Promise<{ country: string; result: boolean }> {
    if (Config.environment === 'loc' || userIp?.includes(Config.azureIpSubstring))
      return { country: 'INTERN', result: true };

    const country = await this.geoLocationService.getCountry(userIp);
    const countryObject = await this.countryService.getCountryWithSymbol(country);

    const user = await this.repos.user.findOneBy({ address });
    if (!countryObject || (user && user.role != UserRole.USER)) return { country, result: true };

    return { country, result: countryObject?.ipEnable };
  }
}
