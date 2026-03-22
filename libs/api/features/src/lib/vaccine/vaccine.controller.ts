import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  CurrentClub,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import { vaccineDashboardQuerySchema } from '@org/types';
import type { VaccineDashboardQuery } from '@org/types';
import { VaccineService } from './vaccine.service.js';

@Controller('vaccine-dashboard')
@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
@Roles('ADMIN', 'OWNER')
export class VaccineController {
  constructor(private readonly vaccineService: VaccineService) {}

  @Get()
  async getDashboard(
    @CurrentClub() clubId: string,
    @Query(new ZodValidationPipe(vaccineDashboardQuerySchema))
    query: VaccineDashboardQuery,
  ) {
    return this.vaccineService.getClubVaccineSummary(clubId, query);
  }
}
