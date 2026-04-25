import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { randomUUID } from 'crypto'
import { promisify } from 'util'
import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

const execFileAsync = promisify(execFile)

// Sentinel used when no authenticated user is available (Tally system imports)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

interface LineItemInput {
  itemName: string
  hsnSacCode?: string
  quantity: number
  unitPrice: number
  lineAmount: number
  taxCodeId: string
  cgstRate: number
  sgstRate: number
  igstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  cessAmount?: number
  lineTotal: number
}

interface VoucherItemInput {
  tallyGuid?: string | null
  invoiceNumber: string
  voucherDate: string | Date
  voucherType?: string
  isCreditNote?: boolean
  partyName: string
  partyGstin?: string | null
  totalAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTax: number
  grandTotal: number
  lineItems: LineItemInput[]
}

interface ImportPreview {
  vouchers: VoucherItemInput[]
  [key: string]: unknown
}

interface ConfirmImportBody {
  items: VoucherItemInput[]
  gstinId: string
  companyId: string
}

@Injectable()
export class TallyService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadAndPreview(
    file: Express.Multer.File,
    gstinId: string,
  ): Promise<ImportPreview> {
    // Step 1: Look up the seller GSTIN record
    const gstinRecord = await this.prisma.gstin.findUnique({
      where: { id: gstinId },
    })
    if (!gstinRecord) {
      throw new BadRequestException(`GSTIN not found: ${gstinId}`)
    }

    // Step 2: Sanitise — strip non-alphanumeric, verify length == 15
    const sellerGstin = gstinRecord.gstin.replace(/[^a-zA-Z0-9]/g, '')
    if (sellerGstin.length !== 15) {
      throw new BadRequestException(
        `Invalid GSTIN length after sanitisation: "${sellerGstin}"`,
      )
    }

    // Step 3: Write buffer to a temp file
    const tmpPath = path.join('/tmp', `tally_${randomUUID()}.xml`)
    await fs.writeFile(tmpPath, file.buffer)

    // Step 4: try/finally — always clean up the temp file
    try {
      // Step 5: Call Python CLI
      const cliPath = path.join(
        process.cwd(),
        'apps/compliance/src/tally_importer_cli.py',
      )
      const { stdout } = await execFileAsync('python3', [
        cliPath,
        tmpPath,
        sellerGstin,
      ])

      // Step 6: Parse stdout as JSON
      let result: ImportPreview
      try {
        result = JSON.parse(stdout) as ImportPreview
      } catch {
        throw new InternalServerErrorException(
          'Failed to parse output from Tally importer',
        )
      }

      if (result['error']) {
        throw new BadRequestException(result['error'] as string)
      }

      // Step 7: Return parsed ImportPreview
      return result
    } finally {
      fs.unlink(tmpPath).catch(() => {
        // Ignore cleanup errors — temp file will be swept by OS
      })
    }
  }

  async confirmImport(
    body: ConfirmImportBody,
  ): Promise<{ inserted: number; skipped_duplicates: number; warnings: [] }> {
    const { items, gstinId, companyId } = body

    // Step 1: Collect non-null tallyGuids from the incoming items
    const incomingGuids = items
      .map((item) => item.tallyGuid)
      .filter((g): g is string => g != null && g !== '')

    // Step 2: Query for any existing vouchers with those guids
    const existingVouchers = await this.prisma.voucher.findMany({
      where: { tallyGuid: { in: incomingGuids } },
      select: { tallyGuid: true },
    })
    const duplicateGuids = new Set(
      existingVouchers.map((v) => v.tallyGuid).filter(Boolean) as string[],
    )

    // Step 3: Keep only items whose guid is not a duplicate
    const dedupedItems = items.filter(
      (item) => !item.tallyGuid || !duplicateGuids.has(item.tallyGuid),
    )
    const skipped = items.length - dedupedItems.length

    // Step 4: Nothing to insert after dedup
    if (dedupedItems.length === 0) {
      return { inserted: 0, skipped_duplicates: skipped, warnings: [] }
    }

    // Step 5: Bulk insert inside a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const item of dedupedItems) {
        const resolvedType = resolveVoucherType(item)

        const voucher = await tx.voucher.create({
          data: {
            tallyGuid: item.tallyGuid ?? null,
            companyId,
            gstinId,
            voucherType: resolvedType,
            voucherNumber: item.invoiceNumber,
            invoiceDate: new Date(item.voucherDate),
            partyName: item.partyName,
            partyGstin: item.partyGstin ?? null,
            totalAmount: item.totalAmount,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount,
            totalTax: item.totalTax,
            grandTotal: item.grandTotal,
            status: 'finalized',
            createdBy: SYSTEM_USER_ID,
          },
        })

        for (const line of item.lineItems) {
          await tx.voucherLineItem.create({
            data: {
              voucherId: voucher.id,
              itemName: line.itemName,
              hsnSacCode: line.hsnSacCode ?? null,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineAmount: line.lineAmount,
              taxCodeId: line.taxCodeId,
              cgstRate: line.cgstRate,
              sgstRate: line.sgstRate,
              igstRate: line.igstRate,
              cgstAmount: line.cgstAmount,
              sgstAmount: line.sgstAmount,
              igstAmount: line.igstAmount,
              cessAmount: line.cessAmount ?? 0,
              lineTotal: line.lineTotal,
            },
          })
        }
      }
    })

    // Step 6: Return result
    return {
      inserted: dedupedItems.length,
      skipped_duplicates: skipped,
      warnings: [],
    }
  }
}

function resolveVoucherType(item: VoucherItemInput): string {
  if (item.isCreditNote) return 'credit_note'
  if (item.voucherType) return item.voucherType
  return 'sales_invoice'
}
