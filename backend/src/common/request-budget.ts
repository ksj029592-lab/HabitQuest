import { HttpException, HttpStatus } from '@nestjs/common';

export class RequestBudget {
  private readonly accepted: number[] = [];
  private inFlight = 0;

  constructor(private readonly perMinute: number, private readonly maxInFlight: number) {}

  async run<T>(request: () => Promise<T>): Promise<T> {
    const now = Date.now();
    while (this.accepted.length && this.accepted[0] <= now - 60_000) this.accepted.shift();
    if (this.accepted.length >= this.perMinute || this.inFlight >= this.maxInFlight) {
      throw new HttpException('요청이 많아요. 잠시 후 다시 시도해 주세요.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.accepted.push(now);
    this.inFlight++;
    try {
      return await request();
    } finally {
      this.inFlight--;
    }
  }
}
