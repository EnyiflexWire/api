import type { Hono } from 'hono'
import { env } from 'hono/adapter'
import qrcode from 'qr-image'
import type { Services } from '#/service'
import type { Address, Environment } from '#/types'
import { isAddress } from '#/utilities'

const efplogoSVG = `<svg width="51.2" height="51.2" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="91" height="91" fill="#333333" transform="translate(149.8, 149.8)"/>
<rect width="51.2" height="51.2" rx="7.5" fill="url(#paint0_linear_564_124)" transform="translate(170, 170)"/>
<rect width="51.2" height="51.2" rx="7.5" fill="white" fill-opacity="0.5" transform="translate(170, 170)"/>
<path d="M16.768 25.856L25.536 11.264L34.24 25.856L25.536 31.168L16.768 25.856Z" fill="url(#paint1_linear_564_124)" transform="translate(170, 170)"/>
<path d="M16.768 25.856L25.536 11.264L34.24 25.856L25.536 31.168L16.768 25.856Z" fill="#333333" transform="translate(170, 170)"/>
<path d="M25.536 32.768L16.768 27.456L25.536 39.808L34.24 27.456L25.536 32.768Z" fill="url(#paint2_linear_564_124)" transform="translate(170, 170)"/>
<path d="M25.536 32.768L16.768 27.456L25.536 39.808L34.24 27.456L25.536 32.768Z" fill="#333333" transform="translate(170, 170)"/>
<path d="M36.736 34.176H34.24V37.888H30.784V40.192H34.24V44.032H36.736V40.192H40.128V37.888H36.736V34.176Z" fill="url(#paint3_linear_564_124)" transform="translate(170, 170)"/>
<path d="M36.736 34.176H34.24V37.888H30.784V40.192H34.24V44.032H36.736V40.192H40.128V37.888H36.736V34.176Z" fill="#333333" transform="translate(170, 170)"/>
<defs>
<linearGradient id="paint0_linear_564_124" x1="25.6" y1="0" x2="25.6" y2="51.2" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint1_linear_564_124" x1="28.448" y1="11.264" x2="28.448" y2="44.032" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint2_linear_564_124" x1="28.448" y1="11.264" x2="28.448" y2="44.032" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
<linearGradient id="paint3_linear_564_124" x1="28.448" y1="11.264" x2="28.448" y2="44.032" gradientUnits="userSpaceOnUse">
<stop stop-color="#FFF500"/>
<stop offset="1" stop-color="#FF79C9"/>
</linearGradient>
</defs>
</svg>`

export function qr(users: Hono<{ Bindings: Environment }>, services: Services) {
  users.get('/:addressOrENS/qr', async context => {
    const { addressOrENS } = context.req.param()

    let address: Address
    if (isAddress(addressOrENS)) {
      address = addressOrENS.toLowerCase() as Address
    } else {
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
            <stop offset="0%" style="stop-color:#f9ff7c;stop-opacity:1" />
            <stop offset="80%" style="stop-color:#ffade0;stop-opacity:1" />
        </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="#333333"/>`
      )
      .replace(/<path/g, '<path fill="url(#grad1)" ')

    const svgWithLogo = image.replace('</svg>', `${efplogoSVG}</svg>`)
    context.header('Content-Type', 'image/svg+xml;charset=utf-8')
    return context.body(svgWithLogo)
  })
}
