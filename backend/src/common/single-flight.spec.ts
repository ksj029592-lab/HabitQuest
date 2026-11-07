import { SingleFlight } from './single-flight';
it('shares in-flight calls and allows an explicit retry after failure', async () => {
  const flights = new SingleFlight();
  const work = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('ready');
  const results = await Promise.allSettled([flights.run('user:quest', work), flights.run('user:quest', work)]);
  expect(work).toHaveBeenCalledTimes(1);
  expect(results.every((result) => result.status === 'rejected')).toBe(true);
  await expect(flights.run('user:quest', work)).resolves.toBe('ready');
  expect(work).toHaveBeenCalledTimes(2);
});
