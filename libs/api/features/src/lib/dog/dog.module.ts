import { Module } from '@nestjs/common';
import { DogController } from './dog.controller.js';
import { DogService } from './dog.service.js';
import { VaccineController } from './vaccine.controller.js';
import { VaccineService } from './vaccine.service.js';
import { R2Service } from '../document/r2.service.js';

@Module({
  controllers: [DogController, VaccineController],
  providers: [DogService, VaccineService, R2Service],
  exports: [DogService, VaccineService],
})
export class DogModule {}
