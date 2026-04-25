import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { TallyService } from './tally.service'

@Controller('tally')
export class TallyController {
  constructor(private readonly tallyService: TallyService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('gstinId') gstinId: string,
  ) {
    return this.tallyService.uploadAndPreview(file, gstinId)
  }

  @Post('confirm')
  confirm(
    @Body() body: { items: unknown[]; gstinId: string; companyId: string },
  ) {
    return this.tallyService.confirmImport(body)
  }
}
