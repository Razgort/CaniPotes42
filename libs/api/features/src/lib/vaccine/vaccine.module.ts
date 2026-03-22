import { Module } from '@nestjs/common';
import { VaccineController } from './vaccine.controller.js';
import { VaccineService } from './vaccine.service.js';

@Module({
  controllers: [VaccineController],
  providers: [VaccineService],
  exports: [VaccineService],
})
export class VaccineModule {}
