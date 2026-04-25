import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { InvoicingModule } from "./invoicing/invoicing.module";
import { StockModule } from "./stock/stock.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { TallyModule } from "./tally/tally.module";

@Module({
  imports: [PrismaModule, InvoicingModule, StockModule, ComplianceModule, TallyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
