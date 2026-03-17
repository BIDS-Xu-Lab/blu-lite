export function txtToAnnotationJson(filename, textContent) {
  const content = textContent.replace(/\t/g, ' ').replace(/\r\n/g, '\n')
  return {
    filename: filename.replace(/\.txt$/, '.json'),
    content,
    indexes: {},
  }
}

export function normalizeAnnotationFilename(filename, fallbackName = '') {
  if (typeof filename === 'string' && filename.trim() !== '') {
    return filename
  }
  if (typeof fallbackName === 'string' && fallbackName.trim() !== '') {
    return fallbackName
  }
  return ''
}

export function normalizeAnnotationData(data, fallbackName = '') {
  if (!data || typeof data !== 'object') return data
  return {
    ...data,
    filename: normalizeAnnotationFilename(data.filename, fallbackName),
  }
}
