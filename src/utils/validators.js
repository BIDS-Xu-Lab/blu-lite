export function validateSchema(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Schema must be a JSON object')
  }
  if (!obj.name || typeof obj.name !== 'string') {
    throw new Error('Schema must have a "name" string field')
  }
  if (!Array.isArray(obj.entity)) {
    throw new Error('Schema must have an "entity" array field')
  }
  if (!Array.isArray(obj.relation)) {
    throw new Error('Schema must have a "relation" array field')
  }
  for (const entity of obj.entity) {
    if (!entity.name || typeof entity.name !== 'string') {
      throw new Error('Each entity must have a "name" string field')
    }
    if (entity.attrs && !Array.isArray(entity.attrs)) {
      throw new Error(`Entity "${entity.name}" attrs must be an array`)
    }
  }
  const entityNameSet = new Set(obj.entity.map((e) => e.name))
  for (const relation of obj.relation) {
    if (!relation.name || typeof relation.name !== 'string') {
      throw new Error('Each relation must have a "name" string field')
    }
    if (relation.from_entity && !entityNameSet.has(relation.from_entity)) {
      throw new Error(`Relation "${relation.name}" from_entity "${relation.from_entity}" not found in entity definitions`)
    }
    if (relation.to_entity && !entityNameSet.has(relation.to_entity)) {
      throw new Error(`Relation "${relation.name}" to_entity "${relation.to_entity}" not found in entity definitions`)
    }
  }
  return true
}

export function validateAnnotationFile(obj) {
  if (!obj || typeof obj !== 'object') return false
  if (typeof obj.filename !== 'string') return false
  if (typeof obj.content !== 'string') return false
  if (!obj.indexes || typeof obj.indexes !== 'object') return false
  return true
}
