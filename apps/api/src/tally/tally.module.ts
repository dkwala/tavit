import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { TallyController } from './tally.controller'
import { TallyService } from './tally.service'

@Module({
  imports: [PrismaModule],
  controllers: [TallyController],
  providers: [TallyService],
  exports: [TallyService],
})
export class TallyModule {}
