import { Module } from "@nestjs/common";
import { StockItemsModule } from "./stock-items/stock-items.module";
import { StockTransactionsModule } from "./stock-transactions/stock-transactions.module";

@Module({
  imports: [StockItemsModule, StockTransactionsModule],
  exports: [StockItemsModule, StockTransactionsModule],
})
export class StockModule {}
