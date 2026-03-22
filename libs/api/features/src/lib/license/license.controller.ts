import {
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
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import {
  createLicenseTypeSchema,
  updateLicenseTypeSchema,
} from '@org/types';
import type { CreateLicenseType, UpdateLicenseType } from '@org/types';
import { LicenseService } from './license.service.js';

@Controller('clubs/:clubId/license-types')
export class LicenseController {
  private readonly logger = new Logger(LicenseController.name);

  constructor(private readonly licenseService: LicenseService) {}

  @Get()
  @UseGuards(JwtAuthGuard, ClubGuard)
  async findAll(@Param('clubId') clubId: string) {
    return { data: await this.licenseService.findAll(clubId) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @UsePipes(new ZodValidationPipe(createLicenseTypeSchema))
  async create(
    @Param('clubId') clubId: string,
    @Body() dto: CreateLicenseType,
  ) {
    return { data: await this.licenseService.create(clubId, dto) };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @UsePipes(new ZodValidationPipe(updateLicenseTypeSchema))
  async update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLicenseType,
  ) {
    return { data: await this.licenseService.update(id, clubId, dto) };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async remove(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
  ) {
    return { data: await this.licenseService.softDelete(id, clubId) };
  }
}
