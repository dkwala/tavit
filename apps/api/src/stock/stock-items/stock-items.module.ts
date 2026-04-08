import { Module } from "@nestjs/common";
import { StockItemsService } from "./stock-items.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [StockItemsService],
  exports: [StockItemsService],
})
export class StockItemsModule {}
