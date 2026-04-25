import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { PenaltyService } from './penalty.service'
import { AlertsService } from './alerts.service'
import { AlertsScheduler } from './alerts.scheduler'
import { GstrService } from './gstr.service'
import { GstrController } from './gstr.controller'

// Conditionally import ScheduleModule only if @nestjs/schedule is available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scheduleImports: any[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ScheduleModule } = require('@nestjs/schedule')
  scheduleImports = [ScheduleModule.forRoot()]
} catch { /* @nestjs/schedule not installed yet */ }

@Module({
  imports: [PrismaModule, ...scheduleImports],
  controllers: [GstrController],
  providers: [PenaltyService, AlertsService, AlertsScheduler, GstrService],
  exports: [PenaltyService, AlertsService, GstrService],
})
export class ComplianceModule {}
