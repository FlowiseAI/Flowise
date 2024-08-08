export const respond401 = () => {
    return new Response('Unauthorized', {
        status: 401
    })
}
