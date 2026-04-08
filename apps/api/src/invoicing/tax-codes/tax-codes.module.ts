import { Module } from "@nestjs/common";
import { TaxCodesService } from "./tax-codes.service";
import { TaxCodesController } from "./tax-codes.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [TaxCodesService],
  controllers: [TaxCodesController],
  exports: [TaxCodesService],
})
export class TaxCodesModule {}
