import { Injectable, Logger, Optional } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AlertsService } from './alerts.service'

// Cron decorator is loaded lazily so the module compiles even without
// @nestjs/schedule installed. When the package IS installed, the scheduler
// runs automatically. When it isn't, the method can still be triggered manually.
let Cron: ((expr: string) => MethodDecorator) | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Cron = require('@nestjs/schedule').Cron
} catch { /* package not installed yet */ }

function maybeCron(expr: string): MethodDecorator {
  if (Cron) return Cron(expr)
  return () => {}
}

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  // 8:00 AM IST = 02:30 UTC
  @(maybeCron('30 2 * * *') as MethodDecorator)
  async sendDailyAlerts() {
    this.logger.log('Running daily compliance alerts…')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalSent = 0

    for (const daysBefore of [7, 3, 1]) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + daysBefore)

      // Find all pending/overdue deadlines due exactly `daysBefore` days from today
      const deadlines = await this.prisma.complianceDeadline.findMany({
        where: {
          dueDate: targetDate,
          status: { in: ['pending', 'overdue'] },
        },
        include: {
          gstin:   true,
          company: true,
        },
      })

      for (const deadline of deadlines) {
        // Find users with alert preferences for this company that include this day count
        const prefs = await this.prisma.alertPreference.findMany({
          where: { companyId: deadline.companyId },
        })

        for (const pref of prefs) {
          if (!pref.alertDays.includes(daysBefore)) continue

          // Check if this alert was already sent (dedup)
          const alreadySentEmail = pref.emailEnabled
            ? await this.prisma.alertLog.findUnique({
                where: {
                  deadlineId_userId_alertType_daysBefore: {
                    deadlineId: deadline.id,
                    userId: pref.userId,
                    alertType: 'email',
                    daysBefore,
                  },
                },
              })
            : true

          const alreadySentWa = pref.whatsappEnabled && pref.whatsappNumber
            ? await this.prisma.alertLog.findUnique({
                where: {
                  deadlineId_userId_alertType_daysBefore: {
                    deadlineId: deadline.id,
                    userId: pref.userId,
                    alertType: 'whatsapp',
                    daysBefore,
                  },
                },
              })
            : true

          if (alreadySentEmail && alreadySentWa) continue

          // Fetch user's email from Supabase auth.users via raw SQL
          // (Prisma doesn't model auth.users — we use a raw query)
          let userEmail: string | null = null
          try {
            const rows = await this.prisma.$queryRaw<{ email: string }[]>`
              SELECT email FROM auth.users WHERE id = ${pref.userId}::uuid LIMIT 1
            `
            userEmail = rows[0]?.email ?? null
          } catch {
            this.logger.warn(`Could not fetch email for user ${pref.userId}`)
          }

          await this.alerts.sendDeadlineAlert(
            pref.userId,
            deadline,
            daysBefore,
            pref.emailEnabled && !alreadySentEmail,
            pref.whatsappEnabled && !!pref.whatsappNumber && !alreadySentWa,
            pref.whatsappNumber,
            userEmail,
          )
          totalSent++
        }
      }
    }

    this.logger.log(`Daily alerts done — ${totalSent} user-deadline pair(s) processed`)
  }
}
