class EventBus {
  constructor() {
    this.listeners = new Map()
  }

  addListener(runId, listener) {
    if (!this.listeners.has(runId)) {
      this.listeners.set(runId, [])
    }
    this.listeners.get(runId).push(listener)
  }

  removeListener(runId, listener) {
    if (!this.listeners.has(runId)) return
    const list = this.listeners.get(runId)
    const index = list.indexOf(listener)
    if (index !== -1) {
      list.splice(index, 1)
    }
    if (list.length === 0) {
      this.listeners.delete(runId)
    }
  }

  emit(runId, data) {
    const list = this.listeners.get(runId)
    if (!list) return
    const message = JSON.stringify(data)
    for (const listener of list) {
      try {
        listener(message)
      } catch (err) {
        console.error(`[EventBus] Error calling listener for run ${runId}:`, err.message)
      }
    }
  }
}

export const eventBus = new EventBus()
