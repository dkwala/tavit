import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StockTransaction, Prisma } from "../../generated/prisma";

interface CreateStockTransactionInput {
  companyId: string;
  stockItemId: string;
  transactionType: "inward" | "outward" | "adjustment" | "opening";
  quantity: number;
  unitPrice?: number;
  transactionDate?: Date;
  description?: string;
  voucherId?: string;
}

@Injectable()
export class StockTransactionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a stock transaction and update stock item quantity
   */
  async create(data: CreateStockTransactionInput): Promise<StockTransaction> {
    const stockItem = await this.prisma.stockItem.findUnique({
      where: { id: data.stockItemId },
    });

    if (!stockItem) {
      throw new BadRequestException("Stock item not found");
    }

    // Calculate new quantity based on transaction type
    let quantityChange = data.quantity;
    if (data.transactionType === "outward") {
      quantityChange = -Math.abs(data.quantity);
    } else if (data.transactionType === "opening") {
      // Opening balance replaces current, so change = new - old
      quantityChange = data.quantity - stockItem.openingQuantity;
    }

    const newQuantity = Math.max(0, stockItem.currentQuantity + quantityChange);

    // Create transaction
    const transaction = await this.prisma.stockTransaction.create({
      data: {
        companyId: data.companyId,
        stockItemId: data.stockItemId,
        transactionType: data.transactionType,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        transactionDate: data.transactionDate || new Date(),
        description: data.description,
        voucherId: data.voucherId,
      },
    });

    // Update stock item quantity
    await this.prisma.stockItem.update({
      where: { id: data.stockItemId },
      data: { currentQuantity: newQuantity },
    });

    return transaction;
  }

  findAll(
    companyId: string,
    stockItemId?: string,
  ): Promise<StockTransaction[]> {
    return this.prisma.stockTransaction.findMany({
      where: {
        companyId,
        ...(stockItemId && { stockItemId }),
      },
      include: { stockItem: true, voucher: true },
      orderBy: { transactionDate: "desc" },
    });
  }

  findOne(id: string): Promise<StockTransaction | null> {
    return this.prisma.stockTransaction.findUnique({
      where: { id },
      include: { stockItem: true, voucher: true },
    });
  }

  /**
   * Get stock ledger (complete transaction history for reporting)
   */
  async getStockLedger(stockItemId: string) {
    const transactions = await this.prisma.stockTransaction.findMany({
      where: { stockItemId },
      orderBy: { transactionDate: "asc" },
      include: { voucher: true },
    });

    let runningQuantity = 0;
    const ledger = transactions.map((t) => {
      runningQuantity +=
        t.transactionType === "outward" ? -t.quantity : t.quantity;
      return {
        ...t,
        runningBalance: runningQuantity,
        value: (t.unitPrice || 0) * t.quantity,
      };
    });

    return {
      stockItemId,
      transactions: ledger,
      finalBalance: runningQuantity,
    };
  }
}
