import { ModelRouterClient } from './model-router.client';

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn().mockImplementation(() => ({ getToken: jest.fn().mockResolvedValue({ token: 'test-token' }) })),
}));

describe('ModelRouterClient', () => {
  const environment = { ...process.env };
  let client: ModelRouterClient;

  beforeEach(() => {
    process.env.FOUNDRY_MODEL_ROUTER_ENDPOINT = 'https://example.openai.azure.com/';
    process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT = 'habitquest-router';
    delete process.env.FOUNDRY_MODEL_ROUTER_API_KEY;
    client = new ModelRouterClient();
  });

  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  it.each(['gpt-5.4-2026-03-05', 'gpt-5.4-mini-2026-03-17', 'gpt-5.5-2026-04-24', 'gpt-5.6-sol-2026-07-09'])('accepts only the requested model families: %s', async (model) => {
    const request = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model, choices: [{ message: { content: '{"question":"오늘 무엇을 느꼈나요?"}' } }] })));
    await expect(client.completeJson('Return JSON.', { title: '독서' })).resolves.toEqual({ question: '오늘 무엇을 느꼈나요?' });
    const [url, options] = request.mock.calls[0];
    expect(url).toContain('/deployments/habitquest-router/chat/completions');
    expect(options?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer test-token' }));
    expect(JSON.parse(String(options?.body))).toEqual(expect.objectContaining({ max_completion_tokens: expect.any(Number), response_format: { type: 'json_object' } }));
    expect(JSON.parse(String(options?.body))).not.toHaveProperty('max_tokens');
    expect(JSON.parse(String(options?.body))).not.toHaveProperty('temperature');
  });

  it.each(['gpt-4o-mini', 'gpt-5-mini', 'gpt-5.3', 'gpt-5.40', 'gpt-5.7', 'gpt-6-astra', undefined])('rejects out-of-range or unidentified serving models: %s', async (model) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model, choices: [{ message: { content: '{"approved":true}' } }] })));
    await expect(client.completeJson('Return JSON.', {})).rejects.toThrow();
  });

  it('supports an API key without exposing it in the request body', async () => {
    process.env.FOUNDRY_MODEL_ROUTER_API_KEY = 'local-test-key';
    const request = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model: 'gpt-5.4', choices: [{ message: { content: '{"approved":true}' } }] })));
    await client.completeJson('Return JSON.', {});
    expect(request.mock.calls[0][1]?.headers).toEqual(expect.objectContaining({ 'api-key': 'local-test-key' }));
    expect(request.mock.calls[0][1]?.body).not.toContain('local-test-key');
  });

  it('fails before sending requests when the router deployment is not configured', async () => {
    delete process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT;
    const request = jest.spyOn(global, 'fetch');
    await expect(client.completeJson('Return JSON.', {})).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['http://example.openai.azure.com', 'https://untrusted.example', 'https://example.openai.azure.com/?api-key=secret'])('rejects unsafe endpoint configuration: %s', async (endpoint) => {
    process.env.FOUNDRY_MODEL_ROUTER_ENDPOINT = endpoint;
    const request = jest.spyOn(global, 'fetch');
    await expect(client.completeJson('Return JSON.', {})).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['length', 'content_filter'])('rejects unfinished or filtered model output: %s', async (finishReason) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ model: 'gpt-5.4', choices: [{ finish_reason: finishReason, message: { content: '{"approved":true}' } }] })));
    await expect(client.completeJson('Return JSON.', {})).rejects.toThrow();
  });

  it('does not expose service error bodies or credentials to callers', async () => {
    process.env.FOUNDRY_MODEL_ROUTER_API_KEY = 'local-secret';
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('sensitive service details', { status: 401 }));
    await expect(client.completeJson('Return JSON.', {})).rejects.toThrow('Foundry Model Router');
  });
});