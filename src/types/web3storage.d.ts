declare module 'web3.storage' {
  export class Web3Storage {
    constructor(config: { token: string });
    put(files: any[], opts?: { wrapWithDirectory?: boolean }): Promise<string>;
  }

  // minimal File polyfill typing compatible with web3.storage
  export class File extends Blob {
    constructor(bits: any[], name: string, options?: { type?: string; lastModified?: number });
  }
}
