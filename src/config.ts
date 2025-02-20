import dotenv from 'dotenv'

dotenv.config()

export const config = {
	BOT_TOKEN: process.env.BOT_TOKEN ?? '',
	MONGODB_URI: process.env.MONGODB_URI ?? '',
	CHECK_INTERVAL: process.env.CHECK_INTERVAL ?? '',
}
