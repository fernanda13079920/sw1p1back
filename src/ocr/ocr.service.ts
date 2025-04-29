import { Injectable } from '@nestjs/common';
import { CanvasStorageService } from 'src/rooms/canvas-storage.service';
import { RoomsService } from 'src/rooms/rooms.service';
import * as Tesseract from 'tesseract.js';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class OcrService {
  constructor(
    private readonly canvasStorage: CanvasStorageService,
    private readonly roomsService: RoomsService,
  ) {}

  async analyzeAndDraw(file: Express.Multer.File, roomCode: string) {
    const tempPath = path.join(process.cwd(), 'uploads', file.originalname);
    fs.writeFileSync(tempPath, file.buffer);

    const result = await Tesseract.recognize(tempPath, 'eng');
    const anyResult = result as any;

    const words = anyResult.data.words || [];
    const components = words
      .filter((w: any) => w.text.trim() !== '')
      .map((w: any, index: number) => {
        const x = w.bbox?.x0 || 0;
        const y = w.bbox?.y0 || 0;
        const width = (w.bbox?.x1 || 0) - x;
        const height = (w.bbox?.y1 || 0) - y;

        return {
          id: `comp-${Date.now()}-${index}`,
          type: 'div',
          style: {
            top: `${y}px`,
            left: `${x}px`,
            width: `${width || 100}px`,
            height: `${height || 40}px`,
            position: 'absolute',
            backgroundColor: '#ffffff',
            border: '1px solid #000',
            borderRadius: '4px',
            textAlign: 'center',
            lineHeight: `${height || 40}px`,
            fontSize: '14px',
            color: '#000',
          },
          content: w.text.trim(),
        };
      });

    await this.canvasStorage.saveCanvas(roomCode, components);
    fs.unlinkSync(tempPath);

    return {
      message: 'Componentes generados correctamente',
      components,
    };
  }
}
