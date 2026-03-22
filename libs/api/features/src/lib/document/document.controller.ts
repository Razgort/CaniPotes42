import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  JwtAuthGuard,
  ClubGuard,
  CurrentClub,
  CurrentUser,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { DocumentType } from '@org/types';
import { DocumentService } from './document.service.js';
import { R2Service } from './r2.service.js';
import { z } from 'zod';

const listDocumentsQuerySchema = z.object({
  dogId: z.string().uuid().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['valid', 'expiring', 'expired']).optional(),
});

@Controller('documents')
@UseGuards(JwtAuthGuard, ClubGuard)
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly r2Service: R2Service,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
    @Query('dogId') dogId?: string,
    @Query('expiryDate') expiryDate?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!type || !Object.values(DocumentType).includes(type as DocumentType)) {
      throw new BadRequestException(
        `Type de document invalide. Valeurs acceptées : ${Object.values(DocumentType).join(', ')}`,
      );
    }

    return this.documentService.upload({
      clubId,
      userId: user.sub,
      file,
      type: type as DocumentType,
      expiryDate,
      dogId,
    });
  }

  @Get()
  async findAll(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listDocumentsQuerySchema)) query: z.infer<typeof listDocumentsQuerySchema>,
  ) {
    return this.documentService.findAll(clubId, user.sub, user.role, query);
  }

  @Get(':id')
  async findOne(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.documentService.findOne(id, clubId, user.sub, user.role);
  }

  @Get(':id/download')
  async getDownloadUrl(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const key = await this.documentService.getDocumentKey(id, clubId, user.sub, user.role);
    const url = await this.r2Service.getSignedUrl(key, 3600);
    return { data: { url } };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.documentService.delete(clubId, id, user.sub, user.role);
  }
}
