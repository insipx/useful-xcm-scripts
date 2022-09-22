// Copyright 2017-2022 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { u8aToHex } from "../u8a/index.js";
import { nToU8a } from "./toU8a.js";
/** @internal */

const ZERO_STR = '0x00';
/**
 * @name nToHex
 * @summary Creates a hex value from a bigint object.
 */

export function nToHex(value, {
  bitLength,
  isLe = false,
  isNegative = false
} = {}) {
  return !value ? ZERO_STR : u8aToHex(nToU8a(value, {
    bitLength,
    isLe,
    isNegative
  }));
}