import type { Kysely } from 'kysely'
import type { Address } from 'viem'
import { database } from '#/database'
import type { DB } from '#/types'
import { decodeListStorageLocation } from '#/types/list-location-type'

export interface IEFPIndexerService {
  getListStorageLocation(tokenId: bigint): Promise<`0x${string}` | undefined>
  getListRecordCount(tokenId: bigint): Promise<number>
  getListRecords(tokenId: bigint): Promise<{ version: number; recordType: number; data: `0x${string}` }[]>
  getFollowersCount(address: `0x${string}`): Promise<number>
  getFollowers(address: `0x${string}`): Promise<{ token_id: number; list_user: string }[]>
  getPrimaryList(address: Address): Promise<string | undefined>
}

export class EFPIndexerService implements IEFPIndexerService {
  private readonly db: Kysely<DB>

  constructor(env: Env) {
    this.db = database(env)
  }

  async getPrimaryList(address: Address): Promise<`0x${string}` | undefined> {
    const result1 = await this.db
      .selectFrom('account_metadata')
      .select('value')
      .where('address', '=', address)
      .where('key', '=', 'efp.list.primary')
      .executeTakeFirst()

    const accountMetadataPrimaryList = result1?.value as string | undefined

    if (accountMetadataPrimaryList?.startsWith('0x')) {
      return accountMetadataPrimaryList as `0x${string}`
    }

    // console.log("didn't find account metadata primary list for address: ", address)
    // else try and look for an EFP List NFT where
    // the user is set to the address
    // try looking for a list_nft_view WHERE list_user = address
    const result2 = await this.db
      .selectFrom('list_nfts_view')
      .select('token_id')
      .where('list_user', '=', address)
      .execute()
    const tokenIds = result2.map(({ token_id }) => token_id)
    if (tokenIds.length === 0) {
      // console.log("didn't find any list nft for address: ", address)
      return undefined
    }
    // else choose the lowest token id
    const lowestTokenId: string | null | undefined = tokenIds.sort((a, b) => {
      if (a === null || b === null) {
        return 0
      }
      return Number(a) - Number(b)
    })[0]
    if (lowestTokenId === undefined || lowestTokenId === null) {
      return undefined
    }
    const val: number = Number(lowestTokenId)

    // convert lowestTokenId to a 32-byte hex string
    // Convert the number to a hexadecimal string
    let hex = val.toString(16)

    // Pad the hexadecimal string to 64 characters (32 bytes)
    while (hex.length < 64) {
      hex = `0${hex}`
    }

    return `0x${hex}`
  }

  async getListStorageLocation(tokenId: bigint): Promise<`0x${string}` | undefined> {
    const result = await this.db
      .selectFrom('list_nfts')
      .select('list_storage_location')
      .where('token_id', '=', tokenId.toString())
      .executeTakeFirst()
    return (result?.list_storage_location as Address) || undefined
  }

  async getListRecordCount(tokenId: bigint): Promise<number> {
    const listStorageLocation: Address | undefined = await this.getListStorageLocation(tokenId)
    if (listStorageLocation === undefined || listStorageLocation.length !== 2 + (1 + 1 + 32 + 20 + 32) * 2) {
      return 0
    }
    const { version, locationType, chainId, contractAddress, nonce } = decodeListStorageLocation(listStorageLocation)
    console.log({ version, locationType, chainId, contractAddress, nonce })

    const countResult = await this.db
      .selectFrom('list_records')
      .select(({ fn, val, ref }) => [
        // The `fn` module contains the most common
        // functions.
        fn
          .count<number>('record')
          .as('count')
      ])
      // TODO: WHERE chain id
      .where('contract_address', '=', contractAddress)
      .where('nonce', '=', nonce.toString())
      // TODO: GROUP BY chain id
      .groupBy('contract_address')
      .groupBy('nonce')
      .executeTakeFirst()
    return Number(countResult?.count ?? 0)
  }

  async getListRecords(tokenId: bigint): Promise<{ version: number; recordType: number; data: `0x${string}` }[]> {
    const listStorageLocation = (await this.getListStorageLocation(tokenId)) as Address
    if (listStorageLocation === undefined || listStorageLocation.length !== 2 + (1 + 1 + 32 + 20 + 32) * 2) {
      return []
    }
    const { version, locationType, chainId, contractAddress, nonce } = decodeListStorageLocation(listStorageLocation)
    const result = await this.db
      .selectFrom('list_records')
      .select(['version', 'type', 'data'])
      // TODO: WHERE chain id
      .where('contract_address', '=', contractAddress)
      .where('nonce', '=', nonce.toString())
      .execute()
    return result.map(({ version, type, data }) => ({
      version,
      recordType: type,
      data: data as Address
    }))
  }

  async getListRecordsWithTags(
    tokenId: bigint
  ): Promise<{ version: number; recordType: number; data: `0x${string}`; tags: string[] }[]> {
    const listStorageLocation = (await this.getListStorageLocation(tokenId)) as Address
    if (listStorageLocation === undefined || listStorageLocation.length !== 2 + (1 + 1 + 32 + 20 + 32) * 2) {
      return []
    }
    const { version, locationType, chainId, contractAddress, nonce } = decodeListStorageLocation(listStorageLocation)
    const result = await this.db
      .selectFrom('list_record_tags as tags')
      .fullJoin('list_records as lr', join =>
        join
          .onRef('tags.chain_id', '=', 'lr.chain_id')
          .onRef('tags.contract_address', '=', 'lr.contract_address')
          .onRef('tags.nonce', '=', 'lr.nonce')
          .onRef('tags.record', '=', 'lr.record')
      )
      .select(({ fn, ref }) => [
        'lr.version',
        'lr.type',
        'lr.data',

        // Using fn.agg to aggregate tags into an array
        fn
          .agg<string[]>('array_agg', ['tags.tag'])
          .as('agg_tags')
      ])
      .where('lr.chain_id', '=', chainId.toString())
      .where('lr.contract_address', '=', contractAddress.toLowerCase())
      .where('lr.nonce', '=', nonce.toString())
      .groupBy(['lr.chain_id', 'lr.contract_address', 'lr.nonce', 'lr.record'])
      .execute()
    // filter nulls
    const filtered: { version: number; type: number; data: `0x${string}`; agg_tags: string[] }[] = result.filter(
      ({ version, type, data, agg_tags }) => version !== null && type !== null && data !== null && agg_tags !== null
    ) as { version: number; type: number; data: `0x${string}`; agg_tags: string[] }[]
    return filtered.map(({ version, type, data, agg_tags }) => ({
      version,
      recordType: type,
      data: data as Address,
      tags: agg_tags as string[]
    }))
  }

  async getListRecordsFilterByTags(
    tokenId: bigint,
    tag: string
  ): Promise<{ version: number; recordType: number; data: `0x${string}` }[]> {
    const listStorageLocation = (await this.getListStorageLocation(tokenId)) as Address
    if (listStorageLocation === undefined || listStorageLocation.length !== 2 + (1 + 1 + 32 + 20 + 32) * 2) {
      return []
    }
    const { version, locationType, chainId, contractAddress, nonce } = decodeListStorageLocation(listStorageLocation)
    const result = await this.db
      .selectFrom('list_record_tags')
      .select(['record'])
      .where('chain_id', '=', chainId.toString())
      .where('contract_address', '=', contractAddress)
      .where('nonce', '=', nonce.toString())
      .where('tag', '=', tag)
      .execute()
    // record will be a string 0x1234567890abcdef...
    // the first byte is version
    // the second byte is recordType
    // the rest is data
    // need to decode and convert to correct format
    return result.map(({ record }) => {
      const version: number = Number(`0x${record.slice(2, 4)}`)
      const recordType = Number(`0x${record.slice(4, 6)}`)
      const data: Address = `0x${record.slice(6)}` as Address
      return {
        version,
        recordType,
        data
      }
    })
  }

  async getFollowersCount(address: Address): Promise<number> {
    const possibleDuplicates = await this.getFollowers(address)
    const uniqueUsers = new Set(possibleDuplicates.map(({ list_user }) => list_user))
    return uniqueUsers.size
  }

  async getFollowers(address: Address): Promise<{ token_id: number; list_user: string }[]> {
    const subquery = this.db
      .selectFrom('list_records as lr')
      // inner join because we only want to count records associated with a list nft
      // this will exclude cases where a list record is created but not associated with a list nft
      .innerJoin('list_nfts_view as nft', join =>
        // list storage location
        // - chain id
        // - contract address
        // - nonce
        join
          .onRef('nft.list_storage_location_chain_id', '=', 'lr.chain_id')
          .onRef('nft.list_storage_location_contract_address', '=', 'lr.contract_address')
          .onRef('nft.list_storage_location_nonce', '=', 'lr.nonce')
      )
      // bring in token id and list user
      .select(['lr.chain_id', 'lr.contract_address', 'lr.nonce', 'nft.token_id', 'nft.list_user'])
      .where('version', '=', 1)
      .where('type', '=', 1)
      // filter by query parameters
      .where('data', '=', address)
      .orderBy('nft.token_id', 'asc')

    const result = await subquery.execute()
    if (result === undefined) {
      return []
    }
    return result.map(({ token_id, list_user }) => ({
      token_id: Number(token_id),
      list_user: list_user || ''
    }))
  }

  async getWhoBlocks(address: `0x${string}`): Promise<{ token_id: number; list_user: string }[]> {
    const result = await this.db
      .selectFrom('list_record_tags_extended_view')
      .select(['token_id', 'list_user'])
      .where('has_block_tag', '=', true)
      .where('version', '=', 1)
      .where('type', '=', 1)
      .where('data', '=', address)
      .execute()

    const filtered: { token_id: number; list_user: string }[] = []
    for (const row of result) {
      if (row.token_id === null || row.list_user === null) {
        continue
      }
      filtered.push({
        token_id: Number(row.token_id),
        list_user: row.list_user
      })
    }

    return filtered.map(row => ({
      token_id: Number(row.token_id),
      list_user: row.list_user
    }))
  }

  async getWhoMutes(address: `0x${string}`): Promise<{ token_id: number; list_user: string }[]> {
    const result = await this.db
      .selectFrom('list_record_tags_extended_view')
      .select(['token_id', 'list_user'])
      .where('has_mute_tag', '=', true)
      .where('version', '=', 1)
      .where('type', '=', 1)
      .where('data', '=', address)
      .execute()

    const filtered: { token_id: number; list_user: string }[] = []
    for (const row of result) {
      if (row.token_id === null || row.list_user === null) {
        continue
      }
      filtered.push({
        token_id: Number(row.token_id),
        list_user: row.list_user
      })
    }

    return filtered.map(row => ({
      token_id: Number(row.token_id),
      list_user: row.list_user
    }))
  }

  async getBlocks(tokenId: bigint): Promise<{ version: number; recordType: number; data: `0x${string}` }[]> {
    return await this.getListRecordsFilterByTags(tokenId, 'block')
  }

  async getMutes(tokenId: bigint): Promise<{ version: number; recordType: number; data: `0x${string}` }[]> {
    return await this.getListRecordsFilterByTags(tokenId, 'mute')
  }
}