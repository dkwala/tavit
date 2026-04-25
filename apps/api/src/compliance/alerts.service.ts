import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PenaltyService } from './penalty.service'

// These are dynamically required so the app boots even when the packages are
// not yet installed (they're optional at dev time).
type ResendClient = { emails: { send: (opts: Record<string, unknown>) => Promise<{ error?: { message: string } }> } }
type TwilioClient = { messages: { create: (opts: Record<string, unknown>) => Promise<{ sid: string }> } }

function fmtINR(rupees: number): string {
  return '₹' + rupees.toLocaleString('en-IN')
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name)
  private resend?: ResendClient
  private twilio?: TwilioClient

  constructor(
    private readonly prisma: PrismaService,
    private readonly penalty: PenaltyService,
  ) {
    // Lazy-load optional packages
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Resend } = require('resend')
      this.resend = new Resend(process.env.RESEND_API_KEY)
    } catch {
      this.logger.warn('resend package not installed — email alerts disabled')
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio')
      this.twilio = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      )
    } catch {
      this.logger.warn('twilio package not installed — WhatsApp alerts disabled')
    }
  }

  async sendDeadlineAlert(
    userId: string,
    deadline: {
      id: string
      returnType: string
      periodMonth: number
      periodYear: number
      dueDate: Date
      isNilReturn: boolean
      taxPayable: number
      gstin: { gstin: string; tradeName: string | null }
      company: { name: string }
    },
    daysBefore: number,
    emailEnabled: boolean,
    whatsappEnabled: boolean,
    whatsappNumber: string | null,
    userEmail: string | null,
  ) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const p = this.penalty.calculate(
      deadline.returnType,
      deadline.isNilReturn,
      deadline.dueDate,
      deadline.dueDate, // on due date = 0 penalty; shown for awareness
      deadline.taxPayable,
    )

    const dueLbl = deadline.dueDate.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
    const periodLbl = `${MONTHS[deadline.periodMonth - 1]} ${deadline.periodYear}`
    const gstinStr  = deadline.gstin.gstin
    const returnStr = `${deadline.returnType} · ${periodLbl}`

    // Build the penalty-if-late line for the message
    const todayMs  = today.getTime()
    const dueMs    = deadline.dueDate.getTime()
    const daysLeft = Math.round((dueMs - todayMs) / 86_400_000)
    const penaltyIfLate = this.penalty.calculate(
      deadline.returnType,
      deadline.isNilReturn,
      deadline.dueDate,
      new Date(dueMs + 86_400_000), // 1 day late
      deadline.taxPayable,
    )

    // ── Email ────────────────────────────────────────────────────────────────
    if (emailEnabled && userEmail && this.resend && process.env.RESEND_API_KEY) {
      const subject = `⏰ ${returnStr} due in ${daysBefore} day${daysBefore > 1 ? 's' : ''} — ${deadline.company.name}`
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e2118;">
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${returnStr}</h2>
          <p style="color: #6b7061; margin-bottom: 20px;">Due <strong>${dueLbl}</strong> · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b7061; border-bottom: 1px solid #eaecda;">GSTIN</td><td style="padding: 8px 0; border-bottom: 1px solid #eaecda; font-family: monospace;">${gstinStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7061; border-bottom: 1px solid #eaecda;">Company</td><td style="padding: 8px 0; border-bottom: 1px solid #eaecda;">${deadline.company.name}</td></tr>
            ${penaltyIfLate.lateFee > 0 ? `<tr><td style="padding: 8px 0; color: #c0392b;">Penalty if late</td><td style="padding: 8px 0; color: #c0392b; font-weight: 600;">${fmtINR(penaltyIfLate.lateFee)}/day (capped ${fmtINR(deadline.isNilReturn ? 500 : 2000)})</td></tr>` : ''}
          </table>
          <p style="margin-top: 24px; font-size: 12px; color: #9aa090;">
            This is an automated reminder from Tavit. You can manage your alert settings in the Compliance section.
          </p>
        </div>
      `
      try {
        const { error } = await this.resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'compliance@tavit.in',
          to: userEmail,
          subject,
          html,
        })
        await this.logAlert(deadline.id, userId, 'email', daysBefore, error ? 'failed' : 'sent', error?.message)
      } catch (err: unknown) {
        await this.logAlert(deadline.id, userId, 'email', daysBefore, 'failed', String(err))
      }
    }

    // ── WhatsApp ─────────────────────────────────────────────────────────────
    if (whatsappEnabled && whatsappNumber && this.twilio &&
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM) {
      const body =
        `📅 *${returnStr}* due in *${daysBefore} day${daysBefore > 1 ? 's' : ''}* (${dueLbl})\n` +
        `GSTIN: ${gstinStr} · ${deadline.company.name}\n` +
        (penaltyIfLate.lateFee > 0 ? `⚠️ Late fee: ${fmtINR(penaltyIfLate.lateFee)}/day` : '')

      const cleaned = whatsappNumber.replace(/\D/g, '')
      const to = `whatsapp:+${cleaned.startsWith('91') ? cleaned : '91' + cleaned}`

      try {
        await this.twilio.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
          to,
          body,
        })
        await this.logAlert(deadline.id, userId, 'whatsapp', daysBefore, 'sent')
      } catch (err: unknown) {
        await this.logAlert(deadline.id, userId, 'whatsapp', daysBefore, 'failed', String(err))
      }
    }
  }

  private async logAlert(
    deadlineId: string,
    userId: string,
    alertType: string,
    daysBefore: number,
    status: string,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.alertLog.upsert({
        where: { deadlineId_userId_alertType_daysBefore: { deadlineId, userId, alertType, daysBefore } },
        create: { deadlineId, userId, alertType, daysBefore, status, errorMessage },
        update: { status, errorMessage, sentAt: new Date() },
      })
    } catch (err) {
      this.logger.error('Failed to write alert log', err)
    }
  }
}
