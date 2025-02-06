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
    const { username, password, email } = req.body
    const account = username || email || ''
    if (!account || !password) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Username and password must be provided')
    }
    const { user, accessToken, refreshToken } = await userService.loginUser(username || '', email || '', password || '')
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

// Remove user
const removeUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query
    if (!id) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'User ID must be provided')
    }
    await userService.removeUser(req, id)
    return res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    next(error)
  }
}

// Get users by group
const getUsersByGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupname } = req.query

    if (!groupname) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Group name must be provided')
    }
    const users = await userService.getUsersByGroup(groupname)
    return res.json(users)
  } catch (error) {
    next(error)
  }
}

// Get all users grouped by groupname
const getAllUsersGroupedByGroupname = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groupedUsers = await userService.getAllUsersGroupedByGroupname()
    return res.json(groupedUsers)
  } catch (error) {
    next(error)
  }
}

// Get all users in a group
const getAllGroupUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllGroupUsers()
    return res.json(users)
  } catch (error) {
    next(error)
  }
}

// Add user to a group
const addGroupUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupname } = req.body
    if (!groupname) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Group name and user ID must be provided')
    }
    const user = await userService.addGroupUser(groupname)
    return res.status(StatusCodes.CREATED).json(user)
  } catch (error) {
    next(error)
  }
}

// Delete user from a group
const deleteGroupUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idGroupname } = req.query
    if (!idGroupname) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Group name and user ID must be provided')
    }
    await userService.deleteGroupUser(idGroupname)
    return res.status(StatusCodes.NO_CONTENT).send()
  } catch (error) {
    next(error)
  }
}

// Update user
const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query
    if (!id) {
      throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'User ID must be provided')
    }
    const updatedUser = await userService.updateUser(req, id)
    return res.json(updatedUser)
  } catch (error) {
    next(error)
  }
}

export default {
  registerUser,
  loginUser,
  getUserById,
  removeUser,
  getUsersByGroup,
  getAllUsersGroupedByGroupname,
  getAllGroupUsers,
  addGroupUser,
  deleteGroupUser,
  updateUser
}
