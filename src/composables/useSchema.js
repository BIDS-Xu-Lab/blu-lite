import { useSchemaStore } from '../stores/schemaStore.js'
import { validateSchema } from '../utils/validators.js'

export function useSchema() {
  const schemaStore = useSchemaStore()

  async function loadSchemaFromFile() {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'JSON Schema',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })
    const file = await fileHandle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(text)
    validateSchema(parsed)
    schemaStore.loadSchema(parsed)
    return parsed
  }

  return { loadSchemaFromFile }
}
