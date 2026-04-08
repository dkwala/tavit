import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TaxCode, Prisma } from "../../generated/prisma";

@Injectable()
export class TaxCodesService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.TaxCodeCreateInput): Promise<TaxCode> {
    return this.prisma.taxCode.create({ data });
  }

  findAll(companyId: string): Promise<TaxCode[]> {
    return this.prisma.taxCode.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  findOne(id: string): Promise<TaxCode | null> {
    return this.prisma.taxCode.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.TaxCodeUpdateInput): Promise<TaxCode> {
    return this.prisma.taxCode.update({
      where: { id },
      data,
    });
  }

  delete(id: string): Promise<TaxCode> {
    return this.prisma.taxCode.delete({ where: { id } });
  }
}
