import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';

import { Room } from '../rooms/entities/room.entity';
import { RoomUser } from '../room-user/entities/room-user.entity';
import { User } from '../users/entities/user.entity';

import { RoomsModule } from '../rooms/rooms.module';
import { CanvasStorageService } from '../rooms/canvas-storage.service';
import { RoomsService } from '../rooms/rooms.service';
import { CanvasSyncHelper } from '../rooms/helpers/canvas-sync.helper'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomUser, User]),
    forwardRef(() => RoomsModule),
  ],
  controllers: [OcrController],
  providers: [
    OcrService,
    CanvasStorageService,
    RoomsService,
    CanvasSyncHelper, 
  ],
})
export class OcrModule {}
