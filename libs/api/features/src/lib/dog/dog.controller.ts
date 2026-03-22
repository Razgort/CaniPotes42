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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ClubGuard,
  CurrentClub,
  CurrentUser,
  JwtAuthGuard,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import { createDogSchema, updateDogSchema } from '@org/types';
import type { CreateDog, UpdateDog } from '@org/types';
import { DogService } from './dog.service.js';
import { R2Service } from '../document/r2.service.js';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('dogs')
@UseGuards(JwtAuthGuard, ClubGuard)
export class DogController {
  private readonly logger = new Logger(DogController.name);

  constructor(
    private readonly dogService: DogService,
    private readonly r2Service: R2Service,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createDogSchema))
  async create(
    @Body() dto: CreateDog,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dogService.create(dto, user);
  }

  @Get()
  async findAll(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Query('all') all?: string,
  ) {
    // admin=true query param returns all club dogs; default returns only own dogs
    if (all === 'true') {
      return this.dogService.findAllForClub(clubId);
    }
    return this.dogService.findAllForUser(user.sub, clubId);
  }

  @Get(':dogId')
  async findOne(
    @CurrentClub() clubId: string,
    @Param('dogId') dogId: string,
  ) {
    return this.dogService.findOne(dogId, clubId);
  }

  @Patch(':dogId')
  @UsePipes(new ZodValidationPipe(updateDogSchema))
  async update(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('dogId') dogId: string,
    @Body() dto: UpdateDog,
  ) {
    return this.dogService.update(dogId, user.sub, clubId, dto);
  }

  @Delete(':dogId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('dogId') dogId: string,
  ) {
    await this.dogService.remove(dogId, user.sub, clubId);
  }

  @Post(':dogId/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PHOTO_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Allowed: JPEG, PNG, WebP',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadPhoto(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('dogId') dogId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Delete old photo if exists
    const oldPhotoUrl = await this.dogService.getPhotoUrl(dogId, clubId);
    if (oldPhotoUrl) {
      try {
        const oldKey = this.extractR2Key(oldPhotoUrl);
        if (oldKey) {
          await this.r2Service.delete(oldKey);
        }
      } catch {
        this.logger.warn(`Failed to delete old photo for dog ${dogId}`);
      }
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `clubs/${clubId}/dogs/${dogId}/photo.${ext}`;

    const signedUrl = await this.r2Service.upload(key, file.buffer, file.mimetype);

    return this.dogService.updatePhoto(dogId, user.sub, clubId, signedUrl);
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
