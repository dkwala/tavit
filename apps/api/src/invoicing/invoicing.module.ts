import { Module } from "@nestjs/common";
import { TaxCodesModule } from "./tax-codes/tax-codes.module";
import { VouchersModule } from "./vouchers/vouchers.module";

@Module({
  imports: [TaxCodesModule, VouchersModule],
  exports: [TaxCodesModule, VouchersModule],
})
export class InvoicingModule {}
