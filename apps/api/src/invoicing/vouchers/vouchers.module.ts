import { Module } from "@nestjs/common";
import { VouchersService } from "./vouchers.service";
import { VouchersController } from "./vouchers.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [VouchersService],
  controllers: [VouchersController],
  exports: [VouchersService],
})
export class VouchersModule {}
