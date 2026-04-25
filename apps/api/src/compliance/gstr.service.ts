import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { randomUUID } from 'crypto'
import { promisify } from 'util'
import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

const execFileAsync = promisify(execFile)

@Injectable()
export class GstrService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly _building = new Set<string>()

  async buildGstr3b(gstinId: string, periodMonth: number, periodYear: number) {
    const buildKey = `gstr3b:${gstinId}:${periodMonth}:${periodYear}`
    if (this._building.has(buildKey)) throw new BadRequestException('GSTR-3B build already in progress for this period')
    this._building.add(buildKey)

    try {
      const gstinRecord = await this.prisma.gstin.findUnique({ where: { id: gstinId } })
      if (!gstinRecord) throw new NotFoundException(`GSTIN not found: ${gstinId}`)

      const start  = new Date(periodYear, periodMonth - 1, 1)
      const end    = new Date(periodYear, periodMonth, 1)
      const period = `${String(periodMonth).padStart(2, '0')}${periodYear}`

      const [salesVouchers, purchaseVouchers] = await Promise.all([
        this.prisma.voucher.findMany({
          where: {
            gstinId,
            voucherType: { in: ['sales_invoice', 'credit_note', 'debit_note'] },
            invoiceDate: { gte: start, lt: end },
          },
        }),
        this.prisma.voucher.findMany({
          where: {
            gstinId,
            voucherType: 'purchase_invoice',
            invoiceDate: { gte: start, lt: end },
          },
        }),
      ])

      const sales = salesVouchers.map(v => ({
        taxable_value_paise: v.totalAmount,
        cgst_paise:          v.cgstAmount,
        sgst_paise:          v.sgstAmount,
        igst_paise:          v.igstAmount,
        cess_paise:          0,
        is_nil:              v.cgstAmount === 0 && v.sgstAmount === 0 && v.igstAmount === 0,
      }))

      const purchases = purchaseVouchers.map(v => ({
        cgst_paise: v.cgstAmount,
        sgst_paise: v.sgstAmount,
        igst_paise: v.igstAmount,
        cess_paise: 0,
      }))

      const tmpPath = path.join('/tmp', `gstr3b_${randomUUID()}.json`)
      await fs.writeFile(tmpPath, JSON.stringify({ sales, purchases }))

      try {
        const cliPath = path.join(process.cwd(), 'apps/compliance/src/gstr3b_cli.py')
        const { stdout } = await execFileAsync('python3', [cliPath, gstinRecord.gstin, period, tmpPath])

        let result: Record<string, unknown>
        try {
          result = JSON.parse(stdout) as Record<string, unknown>
        } catch {
          throw new InternalServerErrorException('Failed to parse GSTR-3B output')
        }

        if (result['error']) throw new BadRequestException(result['error'] as string)
        return result
      } finally {
        fs.unlink(tmpPath).catch(() => {})
      }
    } finally {
      this._building.delete(buildKey)
    }
  }

  async buildGstr1(gstinId: string, periodMonth: number, periodYear: number) {
    const buildKey = `gstr1:${gstinId}:${periodMonth}:${periodYear}`
    if (this._building.has(buildKey)) throw new BadRequestException('GSTR-1 build already in progress for this period')
    this._building.add(buildKey)

    try {
      const gstinRecord = await this.prisma.gstin.findUnique({
        where: { id: gstinId },
      })
      if (!gstinRecord) throw new NotFoundException(`GSTIN not found: ${gstinId}`)

      // periodMonth is 1-indexed (January=1, October=10)
      const start = new Date(periodYear, periodMonth - 1, 1)
      const end   = new Date(periodYear, periodMonth, 1)
      const period = `${String(periodMonth).padStart(2, '0')}${periodYear}`

      const vouchers = await this.prisma.voucher.findMany({
        where: {
          gstinId,
          voucherType: { in: ['sales_invoice', 'credit_note', 'debit_note'] },
          invoiceDate: { gte: start, lt: end },
        },
        include: { lineItems: true },
      })

      // Flatten to one serialised dict per line item, sharing voucher-level fields
      const lineItems = vouchers.flatMap(v =>
        v.lineItems.map(li => ({
          voucher_id:          v.id,
          invoice_number:      v.voucherNumber,
          invoice_value_paise: v.grandTotal,
          voucher_date:        v.invoiceDate.toISOString().slice(0, 10),
          voucher_type:        v.voucherType,
          seller_gstin:        gstinRecord.gstin,
          seller_state_code:   gstinRecord.stateCode,
          party_gstin:         v.partyGstin ?? null,
          party_name:          v.partyName,
          item_description:    li.itemName,
          quantity:            li.quantity,
          cgst_rate_bp:        li.cgstRate,
          sgst_rate_bp:        li.sgstRate,
          igst_rate_bp:        li.igstRate,
          cgst_amount_paise:   li.cgstAmount,
          sgst_amount_paise:   li.sgstAmount,
          igst_amount_paise:   li.igstAmount,
          cess_amount_paise:   li.cessAmount,
          line_amount_paise:   li.lineAmount,
          hsn_sac:             li.hsnSacCode ?? null,
        }))
      )

      const tmpPath = path.join('/tmp', `gstr1_${randomUUID()}.json`)
      await fs.writeFile(tmpPath, JSON.stringify(lineItems))

      try {
        const cliPath = path.join(process.cwd(), 'apps/compliance/src/gstr1_cli.py')
        const { stdout } = await execFileAsync('python3', [cliPath, gstinRecord.gstin, period, tmpPath])

        let result: Record<string, unknown>
        try {
          result = JSON.parse(stdout) as Record<string, unknown>
        } catch {
          throw new InternalServerErrorException('Failed to parse GSTR-1 output')
        }

        if (result['error']) throw new BadRequestException(result['error'] as string)

        return result
      } finally {
        fs.unlink(tmpPath).catch(() => {})
      }
    } finally {
      this._building.delete(buildKey)
    }
  }
}
