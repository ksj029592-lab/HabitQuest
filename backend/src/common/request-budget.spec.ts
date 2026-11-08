import { RequestBudget } from './request-budget';

describe('RequestBudget', () => {
  afterEach(() => jest.useRealTimers());

  it('caps concurrent work and frees capacity when a request fails', async () => {
    const budget = new RequestBudget(3, 1);
    let reject: (error: Error) => void;
    const pending = budget.run(() => new Promise<void>((_, fail) => { reject = fail; }));
    const work = jest.fn().mockResolvedValue('ok');
    await expect(budget.run(work)).rejects.toMatchObject({ status: 429 });
    expect(work).not.toHaveBeenCalled();
    reject(new Error('provider offline'));
    await expect(pending).rejects.toThrow('provider offline');
    await expect(budget.run(work)).resolves.toBe('ok');
  });

  it('caps accepted calls in a rolling minute', async () => {
    jest.useFakeTimers().setSystemTime(0);
    const budget = new RequestBudget(1, 2);
    const work = jest.fn().mockResolvedValue('ok');
    await budget.run(work);
    jest.setSystemTime(59_999);
    await expect(budget.run(work)).rejects.toMatchObject({ status: 429 });
    jest.setSystemTime(60_000);
    await expect(budget.run(work)).resolves.toBe('ok');
    expect(work).toHaveBeenCalledTimes(2);
  });
});
