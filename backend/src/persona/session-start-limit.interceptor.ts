import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { defer, lastValueFrom } from 'rxjs';
import { RequestBudget } from '@/common/request-budget';

@Injectable()
export class SessionStartLimitInterceptor implements NestInterceptor {
  private readonly budget = new RequestBudget(12, 3);

  intercept(_context: ExecutionContext, next: CallHandler) {
    return defer(() => this.budget.run(() => lastValueFrom(next.handle())));
  }
}
