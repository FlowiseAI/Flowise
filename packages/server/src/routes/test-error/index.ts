import express from 'express'
const router = express.Router()

router.get('/', (req, res, next) => {
    next(new Error('intentional'))
})

export default router
