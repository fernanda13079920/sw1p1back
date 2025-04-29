import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('roomCode') roomCode: string,
  ) {
    return this.ocrService.analyzeAndDraw(file, roomCode);
  }
  
}
