import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
	title: { type: String, required: true },
	price: { type: Number, required: true },
	currency: { type: String, required: false, default: null },
	unit: { type: String, required: false, default: null },
	url: { type: String, required: true, unique: true },
	followers: [{ type: String }],
	createdAt: { type: Date, default: Date.now },
})

const Product = mongoose.model('Product', productSchema)

export default Product
