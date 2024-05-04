import { useReducer } from 'react'
import PropTypes from 'prop-types'
import alertReducer, { initialState } from '../reducers/dialogReducer'
import ConfirmContext from './ConfirmContext'

const ConfirmContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(alertReducer, initialState)

    return <ConfirmContext.Provider value={[state, dispatch]}>{children}</ConfirmContext.Provider>
}

ConfirmContextProvider.propTypes = {
    children: PropTypes.any
}

export default ConfirmContextProvider
