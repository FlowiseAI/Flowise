import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User, UserRole } from '../../database/entities/User'
import { IUser } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const registerUser = async (body: Partial<IUser>) => {
  try {
    const userId = uuidv4()

    const newUser = new User()
    Object.assign(newUser, body)
    if (!body.username || !body.password || !body.email) {
      throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Username, email and password are required')
    }
    const appServer = getRunningExpressApp()
    const existingUser = await appServer.AppDataSource.getRepository(User).findOne({
      where: {
        username: body.username
      }
    })

    if (existingUser) {
      throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'User already exists')
    }

    const hashedPassword = await bcrypt.hash(body.password, 10)

    Object.assign(newUser, { password: hashedPassword })
    Object.assign(newUser, { id: userId })

    const user = appServer.AppDataSource.getRepository(User).create(newUser)
    const dbResponse = await appServer.AppDataSource.getRepository(User).save(user)
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: userService.registerUser - ${getErrorMessage(error)}`)
  }
}

const loginUser = async (username: string, email: string, password: string) => {
  try {
    const appServer = getRunningExpressApp()
    const user = await appServer.AppDataSource.getRepository(User).findOne({
      where: {
        ...(username && { username }),
        ...(email && { email })
      }
    })
    if (!user) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid username or password')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Invalid username or password')
    }

    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Token secrets are not defined')
    }

    const accessToken = jwt.sign({ id: user.id, username: user.username }, process.env.ACCESS_TOKEN_SECRET)
    const refreshToken = jwt.sign({ id: user.id, username: user.username }, process.env.REFRESH_TOKEN_SECRET)

    return { user, accessToken, refreshToken }
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: userService.loginUser - ${getErrorMessage(error)}`)
  }
}

const getUserById = async (id: string) => {
  try {
    const appServer = getRunningExpressApp()
    const user = await appServer.AppDataSource.getRepository(User).findOne({
      where: {
        id
      }
    })
    if (!user) {
      throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'User not found')
    }
    return user
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: userService.getUserById - ${getErrorMessage(error)}`)
  }
}

const removeUser = async (req: any, id: string) => {
  try {
    const { user } = req
    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const appServer = getRunningExpressApp()
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const foundUserToRemove = await appServer.AppDataSource.getRepository(User).findOne({
      where: {
        id
      }
    })
    if (!foundUserToRemove) {
      throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'User not found')
    }
    const isAuthorizedToRemove =
      foundUser.role === UserRole.MASTER_ADMIN || (foundUser.role === UserRole.ADMIN && foundUser.groupname === foundUserToRemove.groupname)

    if (isAuthorizedToRemove) {
      await appServer.AppDataSource.getRepository(User).remove(foundUserToRemove)
      return { message: 'User removed successfully' }
    }
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: userService.removeUser - ${getErrorMessage(error)}`)
  }
}

//getUsersByGroup
const getUsersByGroup = async (groupname: string) => {
  try {
    const appServer = getRunningExpressApp()
    const users = await appServer.AppDataSource.getRepository(User).find({
      where: {
        groupname
      }
    })

    return users
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: userService.getUsersByGroup - ${getErrorMessage(error)}`)
  }
}

const getAllUsersGroupedByGroupname = async () => {
  try {
    const appServer = getRunningExpressApp()
    const users = await appServer.AppDataSource.getRepository(User).find()

    const groupedUsers = users.reduce((acc, user) => {
      if (!acc[user.groupname]) {
        acc[user.groupname] = []
      }
      acc[user.groupname].push(user)
      return acc
    }, {} as Record<string, User[]>)

    return groupedUsers
  } catch (error) {
    throw new InternalFlowiseError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Error: userService.getAllUsersGroupedByGroupname - ${getErrorMessage(error)}`
    )
  }
}

export default {
  registerUser,
  loginUser,
  getUserById,
  removeUser,
  getUsersByGroup,
  getAllUsersGroupedByGroupname
}
