import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StockItem, Prisma } from "../../generated/prisma";

@Injectable()
export class StockItemsService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.StockItemCreateInput): Promise<StockItem> {
    return this.prisma.stockItem.create({ data });
  }

  findAll(companyId: string): Promise<StockItem[]> {
    return this.prisma.stockItem.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }

  findOne(id: string): Promise<StockItem | null> {
    return this.prisma.stockItem.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.StockItemUpdateInput): Promise<StockItem> {
    return this.prisma.stockItem.update({
      where: { id },
      data,
    });
  }

  delete(id: string): Promise<StockItem> {
    return this.prisma.stockItem.delete({ where: { id } });
  }

  /**
   * Get current stock balance with transaction history
   */
  async getStockBalance(stockItemId: string) {
    const stockItem = await this.prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: {
        stockTransactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    return {
      ...stockItem,
      inTransit: stockItem?.stockTransactions.filter(
        (t) => t.transactionType === "inward",
      ).length,
      reorderNeeded:
        stockItem && stockItem.reorderLevel
          ? stockItem.currentQuantity <= stockItem.reorderLevel
          : false,
    };
  }
}
