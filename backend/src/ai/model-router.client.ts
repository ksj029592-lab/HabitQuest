import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DefaultAzureCredential } from '@azure/identity';

@Injectable()
export class ModelRouterClient {
  private readonly logger = new Logger(ModelRouterClient.name);
  private credential?: DefaultAzureCredential;

  isConfigured(): boolean {
    return Boolean(process.env.FOUNDRY_MODEL_ROUTER_ENDPOINT && process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT);
  }

  async completeJson(instruction: string, input: object): Promise<Record<string, unknown>> {
    const endpoint = process.env.FOUNDRY_MODEL_ROUTER_ENDPOINT;
    const deployment = process.env.FOUNDRY_MODEL_ROUTER_DEPLOYMENT;
    if (!endpoint || !deployment) throw new ServiceUnavailableException('Foundry Model Router 연결 설정이 필요해요.');
    const base = new URL(endpoint);
    if (base.protocol !== 'https:' || !/\.(?:openai\.azure\.com|services\.ai\.azure\.com)$/.test(base.hostname) || base.username || base.password || base.search || base.hash) {
      throw new ServiceUnavailableException('Foundry 리소스의 올바른 HTTPS 엔드포인트가 필요해요.');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const apiKey = process.env.FOUNDRY_MODEL_ROUTER_API_KEY;
      if (apiKey) {
        headers['api-key'] = apiKey;
      } else {
        this.credential ??= new DefaultAzureCredential();
        const access = await this.credential.getToken('https://cognitiveservices.azure.com/.default', { requestOptions: { timeout: 15000 } });
        if (!access?.token) throw new Error('Authentication unavailable');
        headers.Authorization = `Bearer ${access.token}`;
      }
      const response = await fetch(
        `${base.origin}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-10-21`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(45000),
          headers,
          body: JSON.stringify({
            max_completion_tokens: 4096,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: instruction }, { role: 'user', content: JSON.stringify(input) }],
          }),
        },
      );
      if (!response.ok) {
        this.logger.warn(`Model Router request returned status ${response.status}`);
        throw new Error('Inference unavailable');
      }
      const result = await response.json() as { model?: string; choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
      if (typeof result.model !== 'string' || !/^gpt-5\.(?:4|5|6)(?:-|$)/.test(result.model)) {
        throw new ServiceUnavailableException('Router가 허용 범위(GPT-5.4~5.6) 밖의 모델을 선택했어요. Router의 모델 후보 설정을 확인해 주세요.');
      }
      const choice = result.choices?.[0];
      if (choice?.finish_reason && choice.finish_reason !== 'stop') throw new Error('Incomplete inference');
      const content: unknown = JSON.parse(choice?.message?.content || 'null');
      if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('Invalid JSON response');
      this.logger.log(`Model Router serving model: ${result.model}`);
      return content as Record<string, unknown>;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Foundry Model Router에 연결하지 못했어요. 로그인 권한과 연결 설정을 확인해 주세요.');
    }
  }
}