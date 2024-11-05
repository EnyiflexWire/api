import type { Hono } from 'hono'
import { env } from 'hono/adapter'
import qrcode from 'qr-image'

import type { Services } from '#/service'
import type { Address, Environment } from '#/types'
import { isAddress } from '#/utilities'

const efplogoSVG = `<svg width="51.2" height="51.2" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="82" height="82" fill="#333333" rx="10" transform="translate(153.8, 153.8)"/>
<rect width="68" height="68" rx="11" fill="url(#paint0_linear_564_124)" transform="translate(160.928, 160.928)"/>
<rect width="68" height="68" rx="11" fill="white" fill-opacity="0.5" transform="translate(160.928, 160.928)"/>
<path d="M22.13376 34.12992L33.70752 14.86848L45.1968 34.12992L33.70752 41.14176L22.13376 34.12992Z" fill="url(#paint1_linear_564_124)" transform="translate(160.928, 160.928)"/>
<path d="M22.13376 34.12992L33.70752 14.86848L45.1968 34.12992L33.70752 41.14176L22.13376 34.12992Z" fill="#333333" transform="translate(160.928, 160.928)"/>
<path d="M33.70752 43.25376L22.13376 36.24192L33.70752 52.54656L45.1968 36.24192L33.70752 43.25376Z" fill="url(#paint2_linear_564_124)" transform="translate(160.928, 160.928)"/>
<path d="M33.70752 43.25376L22.13376 36.24192L33.70752 52.54656L45.1968 36.24192L33.70752 43.25376Z" fill="#333333" transform="translate(160.928, 160.928)"/>
<path d="M48.49152 45.11232H45.1968V50.01216H40.63488V52.9536H45.1968V58.12224H48.49152V52.9536H53.96832V50.01216H48.49152V45.11232Z" fill="url(#paint3_linear_564_124)" transform="translate(160.928, 160.928)"/>
<path d="M48.49152 45.11232H45.1968V50.01216H40.63488V52.9536H45.1968V58.12224H48.49152V52.9536H53.96832V50.01216H48.49152V45.11232Z" fill="#333333" transform="translate(160.928, 160.928)"/>
<defs>
<linearGradient id="paint0_linear_564_124" x1="30.72" y1="0" x2="30.72" y2="61.44" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint1_linear_564_124" x1="34.1376" y1="13.5168" x2="34.1376" y2="52.8384" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint2_linear_564_124" x1="34.1376" y1="13.5168" x2="34.1376" y2="52.8384" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint3_linear_564_124" x1="34.1376" y1="13.5168" x2="34.1376" y2="52.8384" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
</defs>
</svg>`

export function qr(users: Hono<{ Bindings: Environment }>, services: Services) {
  users.get('/:addressOrENS/qr', async context => {
    const { addressOrENS } = context.req.param()

    let address: Address
    let ensName: string | null = null
    if (isAddress(addressOrENS)) {
      address = addressOrENS.toLowerCase() as Address
      ensName = (await services.ens(env(context)).getENSProfile(address)).name
    } else {
      ensName = addressOrENS
      address = await services.ens(env(context)).getAddress(addressOrENS)
      if (!isAddress(address)) {
        return context.json({ response: 'ENS name not valid or does not exist' }, 404)
      }
    }

    let image = qrcode.imageSync(`https://ethfollow.xyz/${address}`, { type: 'svg' }).toString('utf-8')
    image = image
      .replace(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 39">',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 39">
        <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#FAF35F;stop-opacity:1" />
            <stop offset="80%" style="stop-color:#FFAFDD;stop-opacity:1" />
        </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="#333333"/>`
      )
      .replace(/<path/g, '<path fill="url(#grad1)" ')

    const svgWithLogo = image.replace(
      '</svg>',
      `${efplogoSVG}<image href="https://metadata.ens.domains/mainnet/avatar/${ensName}" width="68" height="68" transform="translate(160.928, 160.928)"/></svg>`
    )
    context.header('Content-Type', 'image/svg+xml;charset=utf-8')
    return context.body(svgWithLogo)
  })
}
