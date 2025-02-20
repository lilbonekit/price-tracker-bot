import cron from 'node-cron'
import Product from '../schemas/goodSchema'
import { getProductInfo } from '../utils/scrapper'
import { parsePrice } from '../utils/price'
import { bot } from '.'
import { config } from '../config'

const checkPrices = async () => {
	console.log('Checking price...')

	const products = await Product.find()
	const userMessages: Record<string, string[]> = {}

	for (const product of products) {
		const productInfo = await getProductInfo(product.url)
		if (!productInfo || !productInfo.price) {
			console.warn(`Can't get price for ${product.url}`)
			continue
		}

		const { price } = parsePrice(productInfo.price)
		if (price === product.price) {
			for (const userId of product.followers) {
				userMessages[userId] = userMessages[userId] || []
				userMessages[userId].push(
					`📢 Ціна на <i>«${product.title}»</i> не змінилася`
				)
			}
			continue
		}

		const priceChange = price > product.price ? '⬆️ зросла' : '⬇️ зменшилася'
		product.price = price
		await product.save()

		for (const userId of product.followers) {
			userMessages[userId] = userMessages[userId] || []
			userMessages[userId].push(
				`📢 Ціна на <i>«${
					product.title
				}»</i>" ${priceChange}!\n💰 Нова ціна: ${price} ${
					product.currency ?? ''
				}`
			)
		}
	}

	for (const [userId, messages] of Object.entries(userMessages)) {
		const text = messages.join('\n\n')
		try {
			await bot.api.sendMessage(userId, text, { parse_mode: 'HTML' })
		} catch (error) {
			console.error(
				`❌ Не вдалося відправити повідомлення користувачу ${userId}:`,
				error
			)
		}
	}
}

export const startPriceWatcher = () => {
	console.log('⏳ Tracker is started')
	cron.schedule(config.CHECK_INTERVAL, checkPrices)
}
