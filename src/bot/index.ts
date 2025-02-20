import { Bot, GrammyError, HttpError } from 'grammy'
import { config } from '../config'
import { getProductInfo } from '../utils/scrapper'
import { extractUrls, isPromUaUrl } from '../utils/url'
import Product from '../schemas/goodSchema'
import { parsePrice } from '../utils/price'
import { InlineKeyboardButton } from 'grammy/types'

export const bot = new Bot(config.BOT_TOKEN)

bot.catch((error) => {
	const ctx = error.ctx
	console.error(`Error while handling update: ${ctx.update.update_id}`)
	const e = error.error

	if (e instanceof GrammyError) {
		console.error('Error in request:', e.description)
		return
	}

	if (e instanceof HttpError) {
		console.error('Could not contact Telegram', e)
		return
	}

	console.error('Unknown error', e)
})

bot.api.setMyCommands([
	{
		command: 'start',
		description: 'Запустити бота',
	},
	{
		command: 'addproduct',
		description: 'Додати новий товар',
	},
	{
		command: 'myproducts',
		description: 'Переглянути відстежувані товари',
	},
])

bot.command('start', async (ctx) => {
	await ctx.react('🤝')
	await ctx.reply(
		'👋 Привіт!\n\n🛍️ Я бот, який допоможе слідкувати за цінами на товари на <b>Prom.ua</b>.\n\n💰 Надішли мені посилання на товар, і я повідомлю, коли ціна зміниться!\n\n🚀 Почни прямо зараз — додай перший товар!',
		{
			parse_mode: 'HTML',
		}
	)
})

// Pagination
let page = 1
const PAGE_SIZE = 5

const showMyProducts = async (ctx: any, page: number) => {
	const userId = ctx?.from?.id.toString()
	const products = await Product.find({ followers: userId })

	if (products.length === 0) {
		await ctx.reply('Ви ще не додали жодного товару')
		return
	}

	const totalPages = Math.ceil(products.length / PAGE_SIZE)

	const currentPageProducts = products.slice(
		(page - 1) * PAGE_SIZE,
		page * PAGE_SIZE
	)

	let message = `<b>Ваші відстежувані товари:</b>\n\n`

	currentPageProducts.forEach((product: any) => {
		message += `📦 <i>${product.title}</i>\n`
		message += `💰 Ціна: <b>${product.price} ${product.currency ?? ''}</b> ${
			product.unit ?? ''
		}\n`
		message += `— — — — — — — — —\n`
	})

	const buttons: InlineKeyboardButton[] = currentPageProducts.map(
		(product: any) => ({
			text: `❌ Видалити ${product.title}`,
			callback_data: `delete_${product._id}`,
		})
	)

	// pagination button
	const paginationButtons: InlineKeyboardButton[] = []
	if (page > 1) {
		paginationButtons.push({
			text: '⬅️ Попередня сторінка',
			callback_data: `page_${page - 1}`,
		})
	}
	if (page < totalPages) {
		paginationButtons.push({
			text: '➡️ Наступна сторінка',
			callback_data: `page_${page + 1}`,
		})
	}

	await ctx.reply(message, { parse_mode: 'HTML' })
	await ctx.reply(
		'Ось ваш список товарів. Для видалення натискайте на кнопку:',
		{
			reply_markup: {
				inline_keyboard: [
					...buttons.map((button) => [button]),
					...paginationButtons.map((button) => [button]),
				],
			},
		}
	)
}

bot.command('myproducts', async (ctx) => {
	await showMyProducts(ctx, page)
})

bot.command('addproduct', async (ctx) => {
	await ctx.reply(
		'🔗 Надішліть посилання на товар з Prom.ua, за яким ви хочете стежити:'
	)
})

bot.on('message:entities:url', async (ctx) => {
	const { text } = ctx.message
	const urls = extractUrls(text)
	const userId = ctx.from.id.toString()

	if (urls.length) {
		await ctx.reply(`⏳ Оброблюю посилання...`)

		for (const url of urls) {
			if (!isPromUaUrl(url)) {
				await ctx.reply(`❌ Це не посилання на товар Prom.ua`)
				return
			}

			let product = await Product.findOne({ url })

			if (!product) {
				const productInfo = await getProductInfo(url)
				if (!productInfo || !productInfo.price) {
					await ctx.reply('❌ Не вдалося отримати ціну для цього товару.')
					return
				}

				const { price, currency, unit } = parsePrice(productInfo.price)

				product = new Product({
					title: productInfo.title,
					price,
					currency,
					unit,
					url,
					followers: [userId],
				})
				await product.save()
				await ctx.reply('✅ Товар успішно додано до вашого списку!')
				return
			}

			if (!product.followers.includes(userId)) {
				product.followers.push(userId)
				await product.save()
				await ctx.reply('✅ Товар успішно додано до вашого списку!')
			} else {
				await ctx.reply('ℹ️ Ви вже стежите за цим товаром!')
			}
		}
	}
})

bot.on('callback_query:data', async (ctx) => {
	const data = ctx.callbackQuery.data
	const userId = ctx.callbackQuery.from.id.toString()

	if (data.startsWith('delete_')) {
		const productId = data.split('_')[1]
		const product = await Product.findById(productId)

		if (!product) {
			await ctx.answerCallbackQuery({ text: '❌ Товар не знайдено!' })
			return
		}

		product.followers = product.followers.filter((id) => id !== userId)
		await product.save()
		await ctx.answerCallbackQuery({
			text: '🗑 Ви більше не стежите за цим товаром!',
		})
		await ctx.deleteMessage()
	}

	if (data.startsWith('page_')) {
		page = parseInt(data.split('_')[1], 10)
		await ctx.editMessageText('Завантаження...', { parse_mode: 'HTML' })
		await showMyProducts(ctx, page)
	}
})

bot.on('message', async (ctx) => {
	await ctx.reply(
		`
Я — бот для відстеження цін на товари з <b>Prom.ua</b>. Ось що я вмію:

1️⃣ Додати товар для відстеження:
   - Надішліть мені посилання на товар з <b>Prom.ua</b>, і я додам його до вашого списку.

2️⃣ Перевірка ціни:
   - Кожні 24 години я перевіряю ціну на товари, що ви відстежуєте, і повідомляю вас про зміни.

3️⃣ Перегляд відстежуваних товарів:
   - Ви можете переглянути всі товари, за якими стежите, та видаляти їх зі списку.

Ось доступні команди:

🔹 /start — Почати використання бота.
🔹 /addproduct — Додати новий товар для відстеження.
🔹 /myproducts — Переглянути ваші відстежувані товари.

Використовуйте команду /addproduct, щоб додати перший товар та почати відстеження цін.

💬 <a href="https://t.me/lilbonekit">Автор телеграм бота</a>`,
		{
			parse_mode: 'HTML',
		}
	)
})

export const startBot = async () => {
	console.log('🤖 Bot is starting...')
	await bot.start()
}
