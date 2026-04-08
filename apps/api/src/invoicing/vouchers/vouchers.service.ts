import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Voucher, VoucherLineItem, Prisma } from "../../generated/prisma";

interface CreateVoucherInput {
  companyId: string;
  gstinId: string;
  voucherType:
    | "sales_invoice"
    | "purchase_invoice"
    | "credit_note"
    | "debit_note";
  voucherNumber: string;
  partyName: string;
  partyPan?: string;
  partyGstin?: string;
  invoiceDate: Date;
  dueDate?: Date;
  description?: string;
  createdBy: string;
}

interface CreateVoucherLineItem {
  itemName: string;
  hsnSacCode?: string;
  quantity: number;
  unitPrice: number; // paise
  taxCodeId: string;
}

@Injectable()
export class VouchersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new voucher in draft status
   */
  async createDraftVoucher(data: CreateVoucherInput): Promise<Voucher> {
    return this.prisma.voucher.create({
      data: {
        ...data,
        status: "draft",
        totalAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        grandTotal: 0,
      },
    });
  }

  /**
   * Add line items to a draft voucher and recalculate totals
   */
  async addLineItems(
    voucherId: string,
    items: CreateVoucherLineItem[],
  ): Promise<Voucher> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new BadRequestException("Voucher not found");
    }

    if (voucher.status !== "draft") {
      throw new BadRequestException("Cannot add items to non-draft voucher");
    }

    // Create line items with tax calculations
    let totalAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of items) {
      const taxCode = await this.prisma.taxCode.findUnique({
        where: { id: item.taxCodeId },
      });

      if (!taxCode) {
        throw new BadRequestException(`Tax code not found: ${item.taxCodeId}`);
      }

      const lineAmount = item.quantity * item.unitPrice;
      totalAmount += lineAmount;

      // Calculate tax based on rates (basis points)
      const cgstAmount = Math.floor(lineAmount * (taxCode.cgstRate / 10000));
      const sgstAmount = Math.floor(lineAmount * (taxCode.sgstRate / 10000));
      const igstAmount = Math.floor(lineAmount * (taxCode.igstRate / 10000));

      const taxAmount = Math.max(cgstAmount + sgstAmount, igstAmount);

      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;

      // Create the line item
      await this.prisma.voucherLineItem.create({
        data: {
          voucherId,
          itemName: item.itemName,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineAmount,
          taxCodeId: item.taxCodeId,
          cgstRate: taxCode.cgstRate,
          sgstRate: taxCode.sgstRate,
          igstRate: taxCode.igstRate,
          cgstAmount,
          sgstAmount,
          igstAmount,
          lineTotal: lineAmount + taxAmount,
        },
      });
    }

    // Update voucher totals
    const totalTax = totalCgst + totalSgst + Math.max(totalIgst, 0);
    const grandTotal = totalAmount + totalTax;

    return this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        totalAmount,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        totalTax,
        grandTotal,
      },
      include: { lineItems: true },
    });
  }

  /**
   * Finalize a voucher (move from draft to finalized)
   * Auto-creates journal entries and stock transactions
   */
  async finalizeVoucher(voucherId: string): Promise<Voucher> {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
      include: { lineItems: true, gstin: true },
    });

    if (!voucher) {
      throw new BadRequestException("Voucher not found");
    }

    if (voucher.status !== "draft") {
      throw new BadRequestException("Only draft vouchers can be finalized");
    }

    if (voucher.lineItems.length === 0) {
      throw new BadRequestException(
        "Cannot finalize voucher without line items",
      );
    }

    // Start a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Update voucher status
      const finalizedVoucher = await tx.voucher.update({
        where: { id: voucherId },
        data: {
          status: "finalized",
          finalizedAt: new Date(),
        },
      });

      // Create journal entries
      // Debit Revenue/Purchase account, Credit GST accounts
      const accountPrefix = voucher.voucherType.includes("sales")
        ? "Sales"
        : "Purchase";

      // Main account entry
      await tx.journalEntry.create({
        data: {
          companyId: voucher.companyId,
          voucherId: voucherId,
          accountName: `${accountPrefix} Account`,
          debitAmount: voucher.voucherType.includes("sales")
            ? 0
            : voucher.totalAmount,
          creditAmount: voucher.voucherType.includes("sales")
            ? voucher.totalAmount
            : 0,
          postedAt: new Date(),
          description: `${voucher.voucherType} - ${voucher.voucherNumber}`,
        },
      });

      // GST entries
      if (voucher.cgstAmount > 0) {
        await tx.journalEntry.create({
          data: {
            companyId: voucher.companyId,
            voucherId: voucherId,
            accountName: voucher.voucherType.includes("sales")
              ? "CGST Payable"
              : "CGST Receivable",
            debitAmount: voucher.voucherType.includes("sales")
              ? 0
              : voucher.cgstAmount,
            creditAmount: voucher.voucherType.includes("sales")
              ? voucher.cgstAmount
              : 0,
            postedAt: new Date(),
            description: `CGST on ${voucher.voucherNumber}`,
          },
        });
      }

      if (voucher.sgstAmount > 0) {
        await tx.journalEntry.create({
          data: {
            companyId: voucher.companyId,
            voucherId: voucherId,
            accountName: voucher.voucherType.includes("sales")
              ? "SGST Payable"
              : "SGST Receivable",
            debitAmount: voucher.voucherType.includes("sales")
              ? 0
              : voucher.sgstAmount,
            creditAmount: voucher.voucherType.includes("sales")
              ? voucher.sgstAmount
              : 0,
            postedAt: new Date(),
            description: `SGST on ${voucher.voucherNumber}`,
          },
        });
      }

      if (voucher.igstAmount > 0) {
        await tx.journalEntry.create({
          data: {
            companyId: voucher.companyId,
            voucherId: voucherId,
            accountName: voucher.voucherType.includes("sales")
              ? "IGST Payable"
              : "IGST Receivable",
            debitAmount: voucher.voucherType.includes("sales")
              ? 0
              : voucher.igstAmount,
            creditAmount: voucher.voucherType.includes("sales")
              ? voucher.igstAmount
              : 0,
            postedAt: new Date(),
            description: `IGST on ${voucher.voucherNumber}`,
          },
        });
      }

      // Create stock transactions if needed
      if (
        voucher.voucherType === "sales_invoice" ||
        voucher.voucherType === "purchase_invoice"
      ) {
        // TODO: Link line items to stock items and create transactions
        // This requires additional mapping of line items to stock items
      }

      return finalizedVoucher;
    });
  }

  /**
   * Create a reversal voucher (credit note or debit note)
   */
  async createReversalVoucher(
    originalVoucherId: string,
    reversalType: "credit_note" | "debit_note",
    createdBy: string,
  ): Promise<Voucher> {
    const original = await this.prisma.voucher.findUnique({
      where: { id: originalVoucherId },
      include: { lineItems: true },
    });

    if (!original) {
      throw new BadRequestException("Original voucher not found");
    }

    if (original.status !== "finalized") {
      throw new BadRequestException(
        "Can only create reversals for finalized vouchers",
      );
    }

    const reversal = await this.prisma.voucher.create({
      data: {
        companyId: original.companyId,
        gstinId: original.gstinId,
        voucherType: reversalType,
        voucherNumber: `${original.voucherNumber}-REV`,
        referenceVoucherId: originalVoucherId,
        partyName: original.partyName,
        partyPan: original.partyPan,
        partyGstin: original.partyGstin,
        invoiceDate: new Date(),
        description: `Reversal of ${original.voucherNumber}`,
        status: "draft",
        isReversalEntry: true,
        createdBy,
        totalAmount: original.totalAmount,
        cgstAmount: original.cgstAmount,
        sgstAmount: original.sgstAmount,
        igstAmount: original.igstAmount,
        totalTax: original.totalTax,
        grandTotal: original.grandTotal,
      },
    });

    // Create line items as reversals
    for (const originalLine of original.lineItems) {
      await this.prisma.voucherLineItem.create({
        data: {
          voucherId: reversal.id,
          itemName: originalLine.itemName,
          hsnSacCode: originalLine.hsnSacCode,
          quantity: -originalLine.quantity, // Negative for reversal
          unitPrice: originalLine.unitPrice,
          lineAmount: -originalLine.lineAmount,
          taxCodeId: originalLine.taxCodeId,
          cgstRate: originalLine.cgstRate,
          sgstRate: originalLine.sgstRate,
          igstRate: originalLine.igstRate,
          cgstAmount: -originalLine.cgstAmount,
          sgstAmount: -originalLine.sgstAmount,
          igstAmount: -originalLine.igstAmount,
          lineTotal: -originalLine.lineTotal,
        },
      });
    }

    return reversal;
  }

  findAll(companyId: string, skip = 0, take = 50) {
    return this.prisma.voucher.findMany({
      where: { companyId, deletedAt: null },
      include: { lineItems: true },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  findOne(id: string) {
    return this.prisma.voucher.findUnique({
      where: { id },
      include: { lineItems: { include: { taxCode: true } } },
    });
  }
}
