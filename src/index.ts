import { startBot } from './bot'
import { startPriceWatcher } from './bot/priceWatcher'
import connectDB from './db'

const bootstrap = async () => {
	await connectDB()
	startPriceWatcher()
	await startBot()
}

bootstrap().catch(console.error)
