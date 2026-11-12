import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env, .env.local 등 환경 변수를 로드
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-vercel-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split('?')[0];
            if (url !== '/api/chat') {
              return next();
            }

            // CORS 및 프리플라이트
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.statusCode = 200;
              res.end();
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let rawBody = '';
            req.on('data', (chunk) => {
              rawBody += chunk;
            });

            req.on('end', async () => {
              try {
                // 실시간으로 .env.local 수정 사항 반영
                const currentEnv = loadEnv(mode, process.cwd(), '');
                if (currentEnv.OPENAI_API_KEY) {
                  process.env.OPENAI_API_KEY = currentEnv.OPENAI_API_KEY;
                }

                const body = rawBody ? JSON.parse(rawBody) : {};
                (req as any).body = body;

                // res 객체에 Vercel 호환 헬퍼 주입
                if (!(res as any).status) {
                  (res as any).status = function (statusCode: number) {
                    this.statusCode = statusCode;
                    return this;
                  };
                }
                if (!(res as any).json) {
                  (res as any).json = function (data: any) {
                    this.setHeader('Content-Type', 'application/json; charset=utf-8');
                    this.end(JSON.stringify(data));
                    return this;
                  };
                }

                // Vite SSR 모듈 로더를 통해 루트의 api/chat.ts 실행
                const apiModule = await server.ssrLoadModule('/api/chat.ts');
                await apiModule.default(req, res);
              } catch (err: any) {
                console.error('[Vite Local API Handler Error]:', err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(
                    JSON.stringify({
                      error: err?.message || '로컬 API 처리 중 서버 오류가 발생했습니다.',
                    })
                  );
                }
              }
            });
          });
        },
      },
    ],
  };
});
