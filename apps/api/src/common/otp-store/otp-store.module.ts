import { Global, Module } from '@nestjs/common';
import { OtpStoreService } from './otp-store.service';

@Global()
@Module({
  providers: [OtpStoreService],
  exports: [OtpStoreService],
})
export class OtpStoreModule {}
