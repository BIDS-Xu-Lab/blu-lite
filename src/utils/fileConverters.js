export function txtToAnnotationJson(filename, textContent) {
  const content = textContent.replace(/\t/g, ' ').replace(/\r\n/g, '\n')
  return {
    filename: filename.replace(/\.txt$/, '.json'),
    content,
    indexes: {},
  }
}
