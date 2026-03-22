import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller.js';
import { DocumentService } from './document.service.js';
import { R2Service } from './r2.service.js';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, R2Service],
  exports: [DocumentService, R2Service],
})
export class DocumentModule {}
