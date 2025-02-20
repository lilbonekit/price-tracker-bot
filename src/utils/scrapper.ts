import puppeteer from 'puppeteer'

export const getProductInfo = async (url: string) => {
	const browser = await puppeteer.launch()
	const page = await browser.newPage()

	try {
		await page.goto(url, { waitUntil: 'domcontentloaded' })

		// Parse title
		const titleElement = await page.$('h1')
		const title = titleElement
			? await page.evaluate((el) => el.textContent?.trim(), titleElement)
			: 'Не знайдено'

		// Parse price and currency
		const priceElement = await page.$("div[data-qaid='product_price']")
		const price = priceElement
			? await page.evaluate(
					(el) => el.getAttribute('data-qaprice'),
					priceElement
			  )
			: null
		const currency = priceElement
			? await page.evaluate(
					(el) => el.getAttribute('data-qacurrency'),
					priceElement
			  )
			: null

		console.log({
			title,
			price: price ? `${parseFloat(price)} ${currency}` : null,
		})

		return { title, price: price ? `${parseFloat(price)} ${currency}` : null }
	} catch (error) {
		console.error('Parsing error', error)
		return null
	} finally {
		await browser.close()
	}
}
