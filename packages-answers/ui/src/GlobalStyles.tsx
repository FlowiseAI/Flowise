import GlobalStyles from '@mui/material/GlobalStyles'

const Styles = () => (
    <GlobalStyles
        styles={{
            a: { textDecoration: 'none' },
            '*': {
                boxSizing: 'border-box',

                padding: 0,
                margin: 0,

                '::-webkit-scrollbar ': {
                    width: '4px',
                    padding: '4px'
                },
                '::-webkit-scrollbar-track ': {
                    background: 'transparent'
                },
                '::-webkit-scrollbar-thumb ': {
                    width: '4px',
                    backgroundColor: 'rgba(155, 155, 155, 0.5)',
                    borderRadius: '20px,',
                    border: 'transparent'
                }
            }
        }}
    />
)
export default Styles
