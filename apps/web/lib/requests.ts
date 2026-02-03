import { API_CONFIG } from './config';

function urlEncode(params: Record<string, unknown>) {
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
    );
    return new URLSearchParams(
      filteredParams as Record<string, string>,
    ).toString();
  }
  return '';
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface Params {
  cacheTime?: number; //缓存时间，单位为s。默认强缓存，0为不缓存
  params?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

interface Props extends Params {
  url: string;
  method: Method;
}

type Config =
  | { next: { revalidate: number } }
  | { cache: 'no-store' }
  | { cache: 'force-cache' };

class Request {
  /**
   * 请求拦截器
   */
  interceptorsRequest({ url, method, params, cacheTime, headers = {} }: Props) {
    let requestPayload = ''; //请求体数据
    const config: Config =
      cacheTime || cacheTime === 0
        ? cacheTime > 0
          ? { next: { revalidate: cacheTime } }
          : { cache: 'no-store' }
        : { cache: 'force-cache' };

    if (params && method === 'GET') {
      //fetch对GET请求等，不支持将参数传在body上，只能拼接url
      url = `${url}?${urlEncode(params)}`;
    } else {
      //非form-data传输JSON数据格式
      if (
        params &&
        headers &&
        headers['Content-Type'] === 'application/x-www-form-urlencoded'
      ) {
        // Encode params as x-www-form-urlencoded
        requestPayload = urlEncode(params);
      } else if (
        !['[object FormData]', '[object URLSearchParams]'].includes(
          Object.prototype.toString.call(params),
        )
      ) {
        Object.assign(headers, { 'Content-Type': 'application/json' });
        requestPayload = JSON.stringify(params);
      }
    }
    return {
      url,
      options: {
        method,
        headers,
        body:
          method !== 'GET' && method !== 'DELETE' ? requestPayload : undefined,
        ...config,
      },
    };
  }

  /**
   * 响应拦截器
   */
  async interceptorsResponse<T>(res: Response): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestUrl = res.url;
      if (res.ok) {
        res
          .clone()
          .json()
          .then((data) => resolve(data as T))
          .catch(async () => {
            const text = await res.clone().text();
            resolve(text as unknown as T);
          });
      } else {
        res
          .clone()
          .text()
          .then((text) => {
            try {
              return resolve(JSON.parse(text));
            } catch {
              return reject({ code: 500, message: text, url: requestUrl });
            }
          });
      }
    });
  }

  async httpFactory<T>({ url = '', params = {}, method }: Props): Promise<T> {
    // 使用 Agno API 基础地址
    const req = this.interceptorsRequest({
      url: url.startsWith('http') ? url : API_CONFIG.baseUrl + '/' + url,
      method,
      params: params.params as Record<string, unknown>,
      cacheTime: params.cacheTime as number,
      headers: params.headers as Record<string, unknown>,
    });
    const res = await fetch(req.url, req.options as RequestInit).catch(
      (err) => {
        console.error('request error:', err);
        return Response.json({
          code: 500,
          message: '服务器暂不可用，请稍后重试',
          url: req.url,
        });
      },
    );
    return this.interceptorsResponse<T>(res);
  }

  async request<T>(method: Method, url: string, params?: Params): Promise<T> {
    return this.httpFactory<T>({
      url,
      params: params as Record<string, unknown>,
      method,
    });
  }

  get<T>(url: string, params?: Params): Promise<T> {
    return this.request('GET', url, params);
  }

  post<T>(url: string, params?: Params): Promise<T> {
    return this.request('POST', url, params);
  }

  put<T>(url: string, params?: Params): Promise<T> {
    return this.request('PUT', url, params);
  }

  delete<T>(url: string, params?: Params): Promise<T> {
    return this.request('DELETE', url, params);
  }

  patch<T>(url: string, params?: Params): Promise<T> {
    return this.request('PATCH', url, params);
  }
}

const request = new Request();

export interface DataResponse<T> {
  code: number;
  message: string;
  success: boolean;
  data: T;
}

export interface Pages<T> {
  totalElements: number;
  pageNum: number;
  pageSize: number;
  totalPage: number;
  content: T[];
}

export default request;
