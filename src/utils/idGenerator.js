let idCounter = Date.now()

export function generateId() {
  return String(++idCounter)
}
