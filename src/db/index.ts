import mongoose from 'mongoose'
import { config } from '../config'

const connectDB = async () => {
	try {
		await mongoose.connect(config.MONGODB_URI)
		console.log('MongoDB connected')
	} catch (err) {
		console.error('MongoDB connection failed', err)
		process.exit(1)
	}
}

export default connectDB
