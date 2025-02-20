export const parsePrice = (rawPrice: string) => {
	const match = rawPrice.match(/([\d\s]+)\s*([^\d\s\/]*)\/?(.*)?/)
	if (!match) throw new Error(`Can't parse price: ${rawPrice}`)

	const price = Number(match[1].replace(/\s/g, ''))
	const currency = match[2] || null
	const unit = match[3] || null

	return { price, currency, unit }
}
