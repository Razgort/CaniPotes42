import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  CurrentClub,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import {
  findMembersQuerySchema,
  updateProfileSchema,
  updateMemberRoleSchema,
  suspendMemberSchema,
} from '@org/types';
import type { FindMembersQuery, UpdateProfile, UpdateMemberRole, SuspendMember } from '@org/types';
import { MemberService } from './member.service.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('members')
@UseGuards(JwtAuthGuard, ClubGuard)
export class MemberController {
  private readonly logger = new Logger(MemberController.name);

  constructor(private readonly memberService: MemberService) {}

  @Get()
  async findAll(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(findMembersQuerySchema)) query: FindMembersQuery,
  ) {
    // ClubGuard sets clubRole on request — we use the user's role from JWT
    return this.memberService.findAll(clubId, query, user.role);
  }

  @Get(':memberId')
  async findOne(
    @CurrentClub() clubId: string,
    @Param('memberId') memberId: string,
  ) {
    const data = await this.memberService.findOne(clubId, memberId);
    return data;
  }

  @Patch(':memberId')
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateProfile(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateProfile,
  ) {
    const data = await this.memberService.updateProfile(
      clubId,
      memberId,
      user.sub,
      dto,
    );
    return data;
  }

  @Post(':memberId/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
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
  async uploadAvatar(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // TODO: Upload to Cloudflare R2 when integration is ready
    // For now, store a placeholder URL pattern
    const avatarUrl = `${clubId}/avatars/${user.sub}/${Date.now()}-${file.originalname}`;

    this.logger.log(
      `Avatar upload for member ${memberId}: ${file.originalname} (${file.size} bytes)`,
    );

    const data = await this.memberService.updateAvatar(
      clubId,
      memberId,
      user.sub,
      avatarUrl,
    );
    return data;
  }

  @Patch(':memberId/role')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async updateRole(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) dto: UpdateMemberRole,
  ) {
    return this.memberService.updateRole(
      clubId,
      memberId,
      dto.role,
      user.sub,
      user.role,
    );
  }

  @Delete(':memberId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async removeMember(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
  ) {
    await this.memberService.removeMember(
      clubId,
      memberId,
      user.sub,
      user.role,
    );
    return { message: 'Member removed' };
  }

  @Patch(':memberId/suspend')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async suspendMember(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(suspendMemberSchema)) _dto: SuspendMember,
  ) {
    return this.memberService.suspendMember(
      clubId,
      memberId,
      user.sub,
      user.role,
    );
  }

  @Patch(':memberId/unsuspend')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async unsuspendMember(
    @CurrentClub() clubId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.memberService.unsuspendMember(clubId, memberId);
  }
}
