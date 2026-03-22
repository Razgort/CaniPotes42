import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { ClubModule } from './club/club.module.js';
import { MemberModule } from './member/member.module.js';
import { EventModule } from './event/event.module.js';
import { DogModule } from './dog/dog.module.js';
import { DocumentModule } from './document/document.module.js';
import { VaccineModule } from './vaccine/vaccine.module.js';
import { ChatModule } from './chat/chat.module.js';
import { PaymentModule } from './payment/payment.module.js';
import { LicenseModule } from './license/license.module.js';

@Module({
  imports: [AuthModule, ClubModule, MemberModule, EventModule, DogModule, DocumentModule, VaccineModule, ChatModule, PaymentModule, LicenseModule],
})
export class FeaturesModule {}
