import { v4 as uuidv4 } from 'uuid'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { User, UserRole } from '../../database/entities/User'
import { IUser } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { GroupUsers } from '../../database/entities/GroupUser'

const registerUser = async (body: Partial<IUser>) => {
  try {
    const userId = uuidv4()
    const newUser = new User()
    Object.assign(newUser, body)
    if (!body.username || !body.password || !body.email || !body.groupname) {
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
    Object.assign(newUser, { role: UserRole.USER })

    const user = appServer.AppDataSource.getRepository(User).create(newUser)
    const dbResponse = await appServer.AppDataSource.getRepository(User).save(user)
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
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
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
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
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

const removeUser = async (req: any, id: any) => {
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
    } else {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Không có quyền xóa user này')
    }
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

//getUsersByGroup
const getUsersByGroup = async (groupname: any) => {
  try {
    const appServer = getRunningExpressApp()
    const users = await appServer.AppDataSource.getRepository(GroupUsers).find({
      where: {
        groupname
      },
      relations: ['users']
    })

    return users
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

const getAllUsersGroupedByGroupname = async () => {
  try {
    const appServer = getRunningExpressApp()
    const users = await appServer.AppDataSource.getRepository(User).find({
      relations: ['group']
    })

    const groupedUsers = users.reduce((acc, user) => {
      if (!acc[user.groupname]) {
        acc[user.groupname] = []
      }
      acc[user.groupname].push(user)
      return acc
    }, {} as Record<string, User[]>)

    return groupedUsers
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

const getAllGroupUsers = async () => {
  try {
    const appServer = getRunningExpressApp()
    const groupUsers = await appServer.AppDataSource.getRepository(GroupUsers).find({
      relations: ['users'],
      order: {
        createdDate: 'ASC'
      }
    })
    return groupUsers
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

const addGroupUser = async (groupname: string) => {
  try {
    const appServer = getRunningExpressApp()
    const newGroupUser = new GroupUsers()
    Object.assign(newGroupUser, { groupname })
    const groupUser = appServer.AppDataSource.getRepository(GroupUsers).create(newGroupUser)
    const dbResponse = await appServer.AppDataSource.getRepository(GroupUsers).save(groupUser)
    return dbResponse
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

const deleteGroupUser = async (id: any) => {
  try {
    const appServer = getRunningExpressApp()
    const groupUser = await appServer.AppDataSource.getRepository(GroupUsers).findOne({
      where: {
        id
      }
    })
    if (!groupUser) {
      throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Group user not found')
    }
    await appServer.AppDataSource.getRepository(GroupUsers).remove(groupUser)
    return { message: 'Group user removed successfully' }
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
  }
}

const updateUser = async (req: any, id: any) => {
  try {
    const { user, body } = req
    const { role } = body
    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const appServer = getRunningExpressApp()
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const foundUserToUpdate = await appServer.AppDataSource.getRepository(User).findOne({
      where: {
        id
      }
    })
    if (!foundUserToUpdate) {
      throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'User not found')
    }

    const isAuthorizedToRemove =
      foundUser.role === UserRole.MASTER_ADMIN || (foundUser.role === UserRole.ADMIN && foundUser.groupname === foundUserToUpdate.groupname)

    Object.assign(foundUserToUpdate, { role })

    if (isAuthorizedToRemove) {
      const updatedUser = await appServer.AppDataSource.getRepository(User).save(foundUserToUpdate)
      return updatedUser
    } else {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Không có quyền update user này')
    }
  } catch (error) {
    throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
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
