import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import userService from '../../services/user'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'

// Register user
const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.registerUser(req.body)
    return res.status(StatusCodes.CREATED).json(user)
  } catch (error) {
    next(error)
  }
}

// Login user
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Username and password must be provided')
    }
    const { user, accessToken, refreshToken } = await userService.loginUser(username, password)
    return res.json({ user, accessToken, refreshToken })
  } catch (error) {
    next(error)
  }
}

// Get user by ID
const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    if (!id) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'User ID must be provided')
    }
    const user = await userService.getUserById(id)
    return res.json(user)
  } catch (error) {
    next(error)
  }
}

export default {
  registerUser,
  loginUser,
  getUserById
}
