import { resolve } from 'path';
import { generateApi } from 'swagger-typescript-api';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

generateApi({
    name: 'Api.ts',
    output: resolve(__dirname, '../src/api'),
    url: 'http://localhost:8080/swagger/doc.json',
    httpClientType: 'axios',
    generateClient: true,
    generateRouteTypes: true,
    generateResponses: true,
    toJS: false,
    extractRequestParams: true,
    extractRequestBody: true,
    extractEnums: true,
    unwrapResponseData: false,
    defaultResponseAsSuccess: false,
    generateUnionEnums: false,
    cleanOutput: true,
});

