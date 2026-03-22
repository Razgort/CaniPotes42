import { Module } from '@nestjs/common';
import { ClubController } from './club.controller.js';
import { ClubService } from './club.service.js';
import { R2Service } from '../document/r2.service.js';

@Module({
  controllers: [ClubController],
  providers: [ClubService, R2Service],
  exports: [ClubService],
})
export class ClubModule {}
