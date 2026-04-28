export class ChatInputHistory {
    constructor(maxHistory = 10) {
        this.history = []
        this.currentIndex = -1
        this.tempInput = ''
        this.maxHistory = maxHistory
        this.loadHistory()
    }

    addToHistory(input) {
        if (!input.trim()) return
        if (this.history[0] !== input) {
            this.history.unshift(input)
            if (this.history.length > this.maxHistory) {
                this.history.pop()
            }
        }
        this.currentIndex = -1
        this.saveHistory()
    }

    getPreviousInput(currentInput) {
        if (this.currentIndex === -1) {
            this.tempInput = currentInput
        }
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++
            return this.history[this.currentIndex]
        }
        return this.history[this.currentIndex] || this.tempInput
    }

    getNextInput() {
        if (this.currentIndex > -1) {
            this.currentIndex--
            if (this.currentIndex === -1) {
                return this.tempInput
            }
            return this.history[this.currentIndex]
        }
        return this.tempInput
    }

    saveHistory() {
        try {
            localStorage.setItem('chatInputHistory', JSON.stringify(this.history))
        } catch (error) {
            console.warn('Failed to save chat history to localStorage:', error)
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('chatInputHistory')
            if (saved) {
                this.history = JSON.parse(saved)
            }
        } catch (error) {
            console.warn('Failed to load chat history from localStorage:', error)
        }
    }
}
