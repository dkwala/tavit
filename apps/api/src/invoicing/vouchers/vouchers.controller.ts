import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  HttpCode,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { VouchersService } from "./vouchers.service";
import {
  CreateVoucherDto,
  CreateVoucherWithItemsDto,
  CreateVoucherLineItemDto,
  FinalizeVoucherDto,
  CreateReversalDto,
} from "./dto/index";
import { Request } from "express";

@Controller("api/vouchers")
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post("draft")
  createDraft(@Body() dto: CreateVoucherDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) throw new BadRequestException("User not authenticated");

    return this.vouchersService.createDraftVoucher({
      ...dto,
      createdBy: userId,
    });
  }

  @Post(":voucherId/add-items")
  addLineItems(
    @Param("voucherId") voucherId: string,
    @Body() dto: { items: CreateVoucherLineItemDto[] },
  ) {
    return this.vouchersService.addLineItems(voucherId, dto.items);
  }

  @Patch(":voucherId/finalize")
  @HttpCode(200)
  finalizeVoucher(@Param("voucherId") voucherId: string) {
    return this.vouchersService.finalizeVoucher(voucherId);
  }

  @Post("reversal")
  createReversal(@Body() dto: CreateReversalDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) throw new BadRequestException("User not authenticated");

    return this.vouchersService.createReversalVoucher(
      dto.originalVoucherId,
      dto.reversalType,
      userId,
    );
  }

  @Get("company/:companyId")
  findByCompany(
    @Param("companyId") companyId: string,
    @Param("skip") skip?: string,
    @Param("take") take?: string,
  ) {
    return this.vouchersService.findAll(
      companyId,
      parseInt(skip || "0"),
      parseInt(take || "50"),
    );
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.vouchersService.findOne(id);
  }
}
