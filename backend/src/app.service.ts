/**
 * 애플리케이션 서비스
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'HabitQuest API Server v0.1.0';
  }
}
