export const extractUrls = (text: string): string[] => {
	const urls: string[] = []
	const entities = text.match(/https?:\/\/[^\s]+/g) || []

	entities.forEach((url) => {
		urls.push(url)
	})

	return urls
}

export const isPromUaUrl = (url: string): boolean => {
	const regex = /^https?:\/\/(www\.)?prom\.ua\//
	return regex.test(url)
}
