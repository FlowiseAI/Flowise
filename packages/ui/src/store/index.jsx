import { createStore } from 'redux'
import reducer from './reducer'

// ==============================|| REDUX - MAIN STORE ||============================== //

export const store = createStore(reducer)
