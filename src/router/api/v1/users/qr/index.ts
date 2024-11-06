import type { Hono } from 'hono'
import { env } from 'hono/adapter'
import qrcode from 'qr-image'

import type { Services } from '#/service'
import type { Address, Environment } from '#/types'
import { isAddress } from '#/utilities'

const efplogoSVG = `<svg width="64" height="64" viewBox="0 0 640 640" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="120.1" height="120.1" fill="#333333" transform="translate(139.9, 140.1)"/>
<rect width="98.94" height="98.94" rx="16.005" fill="url(#paint0_linear_564_124)" transform="translate(150.2, 150.2)"/>
<rect width="98.94" height="98.94" rx="16.005" fill="white" fill-opacity="0.5" transform="translate(150.2, 150.2)"/>
<path d="M32.20462 49.65903L48.04444 21.63364L65.76135 49.65903L48.04444 59.86126L32.20462 49.65903Z" fill="url(#paint1_linear_564_124)" transform="translate(150.2, 150.2)"/>
<path d="M32.20462 49.65903L48.04444 21.63364L65.76135 49.65903L48.04444 59.86126L32.20462 49.65903Z" fill="#333333" transform="translate(150.2, 150.2)"/>
<path d="M48.04444 62.93402L32.20462 52.73279L48.04444 76.45524L65.76135 52.73279L48.04444 62.93402Z" fill="url(#paint2_linear_564_124)" transform="translate(150.2, 150.2)"/>
<path d="M48.04444 62.93402L32.20462 52.73279L48.04444 76.45524L65.76135 52.73279L48.04444 62.93402Z" fill="#333333" transform="translate(150.2, 150.2)"/>
<path d="M70.55516 66.63842H65.76135V73.76769H59.12375V77.61076H65.76135V85.56786H70.55516V77.61076H78.52344V73.76769H70.55516V66.63842Z" fill="url(#paint3_linear_564_124)" transform="translate(150.2, 150.2)"/>
<path d="M70.55516 66.63842H65.76135V73.76769H59.12375V77.61076H65.76135V85.56786H70.55516V77.61076H78.52344V73.76769H70.55516V66.63842Z" fill="#333333" transform="translate(150.2, 150.2)"/>
<defs>
<linearGradient id="paint0_linear_564_124" x1="38.4" y1="0" x2="38.4" y2="76.8" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint1_linear_564_124" x1="42.672" y1="16.896" x2="42.672" y2="66.048" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint2_linear_564_124" x1="42.672" y1="16.896" x2="42.672" y2="66.048" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint3_linear_564_124" x1="42.672" y1="16.896" x2="42.672" y2="66.048" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
</defs>
</svg>`

const getGradientText = (nameOrAddress: string | Address) =>
  `<style>text { font-family: sans-serif; font-size: 3.5px; font-weight: bold; text-anchor: middle; dominant-baseline: middle; }</style><text width="100" height="5" y="41" x="50%" fill="#eeeeee">${
    isAddress(nameOrAddress)
      ? `${nameOrAddress.slice(0, 6)}…${nameOrAddress.slice(38, 42)}`
      : nameOrAddress.length > 18
        ? `${nameOrAddress.slice(0, 18)}…`
        : nameOrAddress
  }</text>`

const getProfileImage = (ensName: string) =>
  `<image width="10" height="10" x="15" rx="1" y="15" xlink:href="https://metadata.ens.domains/mainnet/avatar/${ensName}" /><rect x="14.5" y="14.5" width="11" height="11" rx="2" fill="transparent" stroke="#333333" stroke-width="1" />`

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
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 39 44">
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
      `${efplogoSVG}${ensName ? getProfileImage(ensName) : ''}${getGradientText(ensName || address)}</svg>`
    )

    context.header('Content-Type', 'image/svg+xml;charset=utf-8')
    return context.body(svgWithLogo)
  })
}
