/* tslint:disable prefer-array-literal */

interface IFileParams {
  name: string;
  size: number;
}

const SPACE = 32;
const BLOCK_SIZE = 512;
const NAME_LIMIT = 100;

const NAME_OFFSET = 0;
const MODE_OFFSET = 100;
const SIZE_OFFSET = 124;
const TIME_OFFSET = 136;
const CHKSUM_OFFSET = 148;
const TYPE_OFFSET = 156;
const MAGIC_OFFSET = 257;

const now = () => Math.floor(Date.now() / 1000);

const lpad = (value: number, size: number, radix: number = 8) => {
  const val = value.toString(radix);
  const zeros = '0'.repeat(size);
  return `${zeros}${val}`.substr(-size);
};

const bytes = (...values: Array<number|string>) => {
  const result: number[] = [];

  values.forEach((value) => {
    if (typeof value === 'string') {
      result.push(...value.split('').map(c => c.charCodeAt(0)));
    }

    if (typeof value === 'number') {
      result.push(value);
    }
  });

  return new Uint8Array(result);
};

const checksumOf = (block: Uint8Array) => {
  const sum = block.reduce((r, code) =>  r + code, 256);
  return bytes(lpad(sum, 6), 0, SPACE);
};

export const createEmptyBlock = (size: number = BLOCK_SIZE) => {
  const block = new Uint8Array(size).fill(0);
  return new Blob([block]);
};

export const createFileBlock = (params: IFileParams) => {
  const { name, size } = params;
  const block = new Uint8Array(BLOCK_SIZE).fill(0);

  if (name.length > NAME_LIMIT) {
    throw new Error(`"${params.name}" file name exceeded 100 character limit`);
  }

  block.set(bytes(name), NAME_OFFSET);
  block.set(bytes('000644', SPACE), MODE_OFFSET);
  block.set(bytes(lpad(size, 11), SPACE), SIZE_OFFSET);
  block.set(bytes(lpad(now(), 11), SPACE), TIME_OFFSET);
  block.set(bytes('0'), TYPE_OFFSET);
  block.set(bytes('ustar'), MAGIC_OFFSET);
  block.set(checksumOf(block), CHKSUM_OFFSET);

  return new Blob([block]);
};
