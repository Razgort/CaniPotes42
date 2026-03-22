import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  JwtAuthGuard,
  ClubGuard,
  CurrentUser,
  CurrentClub,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { createVaccineSchema } from '@org/types';
import type { CreateVaccine } from '@org/types';
import { VaccineService } from './vaccine.service.js';
import { R2Service } from '../document/r2.service.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_CERT_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('dogs/:dogId/vaccines')
@UseGuards(JwtAuthGuard, ClubGuard)
export class VaccineController {
  private readonly logger = new Logger(VaccineController.name);

  constructor(
    private readonly vaccineService: VaccineService,
    private readonly r2Service: R2Service,
  ) {}

  @Get()
  async list(
    @Param('dogId') dogId: string,
    @CurrentClub() clubId: string,
  ) {
    return this.vaccineService.listVaccines(dogId, clubId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createVaccineSchema))
  async create(
    @Param('dogId') dogId: string,
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVaccine,
  ) {
    return this.vaccineService.createVaccine(dogId, clubId, user.sub, dto);
  }

  @Patch(':vaccineId')
  async update(
    @Param('dogId') dogId: string,
    @Param('vaccineId') vaccineId: string,
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: Partial<CreateVaccine>,
  ) {
    return this.vaccineService.updateVaccine(dogId, vaccineId, clubId, user.sub, dto);
  }

  @Delete(':vaccineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('dogId') dogId: string,
    @Param('vaccineId') vaccineId: string,
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaccineService.deleteVaccine(dogId, vaccineId, clubId, user.sub);
  }

  @Post(':vaccineId/certificate')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @Param('dogId') dogId: string,
    @Param('vaccineId') vaccineId: string,
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`,
      );
    }

    if (file.size > MAX_CERT_SIZE) {
      throw new BadRequestException(
        `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum: 5MB`,
      );
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `clubs/${clubId}/dogs/${dogId}/vaccines/${vaccineId}/certificate.${ext}`;
    const signedUrl = await this.r2Service.upload(key, file.buffer, file.mimetype);

    this.logger.log(`Certificate uploaded for vaccine ${vaccineId}`);

    return this.vaccineService.uploadCertificate(dogId, vaccineId, clubId, user.sub, signedUrl);
  }

  @Delete(':vaccineId/certificate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCertificate(
    @Param('dogId') dogId: string,
    @Param('vaccineId') vaccineId: string,
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaccineService.deleteCertificate(dogId, vaccineId, clubId, user.sub);
  }
}
