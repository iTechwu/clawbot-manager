export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type Config = { cache: 'no-store' } | { cache: 'force-cache' };

interface Params {
  cache?: Config;
  params?: Record<string, any>;
  headers?: Record<string, any>;
}

interface Props extends Params {
  url: string;
  method: Method;
}

export class HttpClient {
  private baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * 请求拦截器
   */
  interceptorsRequest({ url, method, params, cache, headers = {} }: Props): {
    url: string;
    options: RequestInit;
  } {
    // url参数
    let queryParams = '';
    // 请求体数据
    let requestPayload = '';
    const config: Config = cache || { cache: 'no-store' };

    if (method === 'GET' || method === 'DELETE') {
      // fetch对GET请求, 拼接url参数
      if (params) {
        const searchParams = new URLSearchParams(params);
        // 删除值为 undefined、null 或空字符串的参数
        Object.keys(params).forEach((key) => {
          const value = params[key];
          if (value === undefined || value === null || value === '') {
            searchParams.delete(key);
          }
        });
        queryParams = searchParams.toString();
        url = `${url}?${queryParams}`;
      }
    } else {
      // 非form-data传输JSON数据格式
      if (
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
        return resolve(res.json() as Promise<T>);
      } else {
        res
          .clone()
          .text()
          .then((text) => {
            try {
              return resolve(JSON.parse(text));
            } catch {
              return reject({
                code: 500,
                msg: text,
                url: requestUrl,
              });
            }
          });
      }
    });
  }

  async httpFactory<T>({ url = '', params = {}, method }: Props): Promise<T> {
    const req = this.interceptorsRequest({
      url: url.startsWith('http') ? url : this.baseUrl + url,
      method,
      params: params.params,
      cache: params.cache,
      headers: params.headers,
    });
    const res = await fetch(req.url, req.options);
    return this.interceptorsResponse<T>(res);
  }

  async request<T>(method: Method, url: string, params?: Params): Promise<T> {
    return this.httpFactory<T>({ url, params, method });
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
