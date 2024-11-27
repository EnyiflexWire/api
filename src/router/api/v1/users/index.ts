import { Hono } from 'hono'

import type { Services } from '#/service'
import type { Environment } from '#/types'
import { account } from './account'
import { allFollowers } from './allFollowers'
import { allFollowing } from './allFollowing'
import { commonFollowers } from './commonFollowers'
import { details } from './details'
import { ens } from './ens'
import { followerState } from './followerState'
import { followers } from './followers'
import { following } from './following'
import { latestFollowers } from './latestFollowers'
import { listRecords } from './list-records'
import { lists } from './lists'
import { notifications } from './notifications'
import { poap } from './poap'
import { primaryList } from './primary-list'
import { qr } from './qr'
import { recommended } from './recommended'
import { relationships } from './relationships'
import { searchFollowers } from './searchFollowers'
import { searchFollowing } from './searchFollowing'
import { stats } from './stats'
import { taggedAs } from './taggedAs'
import { tags } from './tags'

export function users(services: Services): Hono<{ Bindings: Environment }> {
  const users = new Hono<{ Bindings: Environment }>()

  // ENS profile metadata
  account(users, services)
  allFollowers(users, services)
  allFollowing(users, services)
  commonFollowers(users, services)
  details(users, services)
  ens(users, services)
  followers(users, services)
  followerState(users, services)
  following(users, services)
  latestFollowers(users, services)
  listRecords(users, services)
  lists(users, services)
  notifications(users, services)
  poap(users, services)
  primaryList(users, services)
  qr(users, services)
  recommended(users, services)
  relationships(users, services)
  searchFollowers(users, services)
  searchFollowing(users, services)
  stats(users, services)
  taggedAs(users, services)
  tags(users, services)

  users.get('/:addressOrENS', context =>
    context.json(
      {
        message: `Not a valid endpoint. Available subpaths: ${[
          '/account',
          '/allFollowers',
          '/commonFollowers',
          '/allFollowing',
          '/details',
          '/ens',
          '/followers',
          '/followerState',
          '/following',
          '/lists',
          '/poap',
          '/primary-list',
          '/profile',
          '/qr',
          '/recommended',
          '/relationships',
          '/searchFollowers',
          '/searchFollowing',
          '/stats',
          '/taggedAs',
          '/tags'
        ].join(', ')}`
      },
      501
    )
  )

  // Blocked by user
  // biome-ignore lint/suspicious/useAwait: <explanation>
  users.get('/:addressOrENS/blocks', async context => {
    return context.text('Not implemented', 501)
  })

  // Muted by user
  // biome-ignore lint/suspicious/useAwait: <explanation>
  users.get('/:addressOrENS/mutes', async context => {
    return context.text('Not implemented', 501)
  })

  // Mutuals with users
  // biome-ignore lint/suspicious/useAwait: <explanation>
  users.get('/:addressOrENS/mutuals', async context => {
    return context.text('Not implemented', 501)
  })

  return users
}
