import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { TaxCodesService } from "./tax-codes.service";
import { CreateTaxCodeDto } from "./dto/create-tax-code.dto";
import { UpdateTaxCodeDto } from "./dto/update-tax-code.dto";
import { Request } from "express";

@Controller("api/tax-codes")
export class TaxCodesController {
  constructor(private readonly taxCodesService: TaxCodesService) {}

  @Post()
  create(@Body() createTaxCodeDto: CreateTaxCodeDto, @Req() req: Request) {
    return this.taxCodesService.create({
      ...createTaxCodeDto,
      company: { connect: { id: createTaxCodeDto.companyId } },
    });
  }

  @Get(":companyId")
  findAll(@Param("companyId") companyId: string) {
    return this.taxCodesService.findAll(companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.taxCodesService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateTaxCodeDto: UpdateTaxCodeDto) {
    return this.taxCodesService.update(id, updateTaxCodeDto);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.taxCodesService.delete(id);
  }
}
