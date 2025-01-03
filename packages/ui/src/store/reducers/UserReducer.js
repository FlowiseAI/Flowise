import { USER_LOGIN_SUCCESS, USER_LOGOUT } from '../actions'

const initialState = {}

const UserReducer = (state = initialState, action) => {
  switch (action.type) {
    case USER_LOGIN_SUCCESS:
      return {
        ...action.payload
      }
    case USER_LOGOUT:
      return {}
    default:
      return state
  }
}

export default UserReducer
