/* eslint-disable node/no-extraneous-import */
import BN from 'bn.js';
const MILLION_CRU_UINT = new BN('1000000000');

export const parseObj = (obj: any) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Convert the number of bytes to TB
 * @param byteSize
 */
export const bytesToTeraBytes = (byteSize: BN) => {
  if (byteSize.isZero()) return 0;
  byteSize = byteSize.div(MILLION_CRU_UINT);
  return byteSize.toNumber() / 1000.0;
};

export const preSlot = (currentSlot: number) => {
  if (currentSlot === 0) {
    return 0;
  } else {
    return currentSlot - 300;
  }
};
