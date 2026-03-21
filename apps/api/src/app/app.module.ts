import { Module } from '@nestjs/common';
import { CoreModule } from '@org/api-core';
import { FeaturesModule } from '@org/api-features';

@Module({
  imports: [CoreModule, FeaturesModule],
})
export class AppModule {}
