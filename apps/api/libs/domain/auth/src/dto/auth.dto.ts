export namespace AuthClient {
  export interface Session {
    userId: string;
    access: string;
    accessExpire: number;
    refresh: string;
    expire: number;
    isAnonymity: boolean;
  }
}
