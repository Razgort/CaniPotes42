import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import { jwtConstants } from '@org/api-core';
import { createClubSchema, updateClubSchema } from '@org/types';
import type { CreateClub, UpdateClub } from '@org/types';
import type { JwtPayload } from '@org/api-core';
import type { Response } from 'express';
import { ClubService } from './club.service.js';
import { R2Service } from '../document/r2.service.js';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('clubs')
export class ClubController {
  private readonly logger = new Logger(ClubController.name);

  constructor(
    private readonly clubService: ClubService,
    private readonly r2Service: R2Service,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(createClubSchema))
  async create(
    @Body() dto: CreateClub,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.clubService.createClub(dto, user);

    res.cookie(
      jwtConstants.refreshTokenCookieName,
      result.refreshToken,
      jwtConstants.refreshTokenCookieOptions,
    );

    return {
      ...result.club,
      accessToken: result.accessToken,
    };
  }

  @Get(':clubId')
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('OWNER')
  async getSettings(@Param('clubId') clubId: string) {
    return this.clubService.findOne(clubId);
  }

  @Patch(':clubId')
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('OWNER')
  @UsePipes(new ZodValidationPipe(updateClubSchema))
  async update(
    @Param('clubId') clubId: string,
    @Body() dto: UpdateClub,
  ) {
    return this.clubService.update(clubId, dto);
  }

  @Post(':clubId/logo')
  @UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
  @Roles('OWNER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('clubId') clubId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`,
      );
    }

    if (file.size > MAX_LOGO_SIZE) {
      throw new BadRequestException(
        `File too large: ${Math.round(file.size / 1024)}KB. Maximum: 2MB`,
      );
    }

    // Delete old logo if exists
    const oldLogo = await this.clubService.getLogo(clubId);
    if (oldLogo) {
      try {
        const oldKey = this.extractR2Key(oldLogo);
        if (oldKey) {
          await this.r2Service.delete(oldKey);
        }
      } catch {
        this.logger.warn(`Failed to delete old logo for club ${clubId}`);
      }
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `clubs/${clubId}/logo/logo.${ext}`;

    const signedUrl = await this.r2Service.upload(
      key,
      file.buffer,
      file.mimetype,
    );

    return this.clubService.updateLogo(clubId, signedUrl);
  }

  private extractR2Key(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.pathname.startsWith('/')
        ? parsed.pathname.slice(1)
        : parsed.pathname;
    } catch {
      return null;
    }
  }
}
