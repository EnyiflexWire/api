export type ListRecord = {
  version: number
  recordType: number
  data: Buffer
}

export type TaggedListRecord = ListRecord & {
  tags: string[]
}

function toHexString(num: number): string {
  return num.toString(16).padStart(2, '0')
}

function uint8ArrayToHexString(arr: Uint8Array): string {
  return Array.from(arr, byte => toHexString(byte)).join('')
}

export function hashRecord(tokenId: bigint, listRecord: ListRecord): `0x${string}` {
  const versionHex = toHexString(listRecord.version)
  const typeHex = toHexString(listRecord.recordType)
  const dataHex = uint8ArrayToHexString(listRecord.data)

  return `0x${tokenId.toString()}-${versionHex}${typeHex}${dataHex}`
}
