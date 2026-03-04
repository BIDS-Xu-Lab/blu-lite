// From https://github.com/gzuidhof/coi-serviceworker (MIT)
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting())

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
  })

  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'deregister') {
      self.registration.unregister().then(() => {
        return self.clients.matchAll()
      }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url))
      })
    }
  })

  self.addEventListener('fetch', (event) => {
    const request = event.request

    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      return
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response
          }

          const headers = new Headers(response.headers)
          headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
          headers.set('Cross-Origin-Opener-Policy', 'same-origin')

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          })
        })
        .catch((err) => {
          console.error(err)
          throw err
        }),
    )
  })
}
