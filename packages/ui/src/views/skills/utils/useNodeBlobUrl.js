import { useEffect, useState } from 'react'

// Hook that turns an async blob fetcher into a temporary object URL suitable
// for `<img src=...>`, `<video src=...>`, or `<a href=...>`. Handles the
// three things an inline `<img src="...api/v1/...download">` cannot:
//   1. Sends the `x-request-from: internal` header (provided by the shared
//      axios client) so the server's auth middleware picks the session/cookie
//      branch instead of the API-key branch.
//   2. Aborts in-flight requests via AbortController when the caller swaps to
//      a different node before the previous fetch resolves, saving bandwidth.
//   3. Revokes the object URL on cleanup so we don't leak blobs as the user
//      clicks through files in the tree.
//
// `fetchBlob` must be a memoised function that accepts an `AbortSignal` as its
// first argument (e.g. a `useCallback` in the parent) – otherwise each render
// triggers a new fetch.
const useNodeBlobUrl = (fetchBlob, enabled = true) => {
    const [state, setState] = useState({ url: null, loading: true, error: null })

    useEffect(() => {
        if (!enabled || typeof fetchBlob !== 'function') {
            setState({ url: null, loading: false, error: null })
            return undefined
        }

        const controller = new AbortController()
        let createdUrl = null
        setState({ url: null, loading: true, error: null })

        fetchBlob(controller.signal)
            .then((blob) => {
                if (controller.signal.aborted) return
                if (!(blob instanceof Blob)) {
                    setState({ url: null, loading: false, error: new Error('Invalid blob response') })
                    return
                }
                createdUrl = URL.createObjectURL(blob)
                setState({ url: createdUrl, loading: false, error: null })
            })
            .catch((err) => {
                if (controller.signal.aborted) return
                setState({ url: null, loading: false, error: err })
            })

        return () => {
            controller.abort()
            if (createdUrl) URL.revokeObjectURL(createdUrl)
        }
    }, [fetchBlob, enabled])

    return state
}

export default useNodeBlobUrl
