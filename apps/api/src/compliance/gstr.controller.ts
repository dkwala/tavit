import { Controller, Post, Body } from '@nestjs/common'
import { GstrService } from './gstr.service'

@Controller('compliance')
export class GstrController {
  constructor(private readonly gstrService: GstrService) {}

  @Post('gstr1/build')
  buildGstr1(
    @Body() body: { gstinId: string; periodMonth: number; periodYear: number },
  ) {
    return this.gstrService.buildGstr1(body.gstinId, body.periodMonth, body.periodYear)
  }

  @Post('gstr3b/build')
  buildGstr3b(
    @Body() body: { gstinId: string; periodMonth: number; periodYear: number },
  ) {
    return this.gstrService.buildGstr3b(body.gstinId, body.periodMonth, body.periodYear)
  }
}
