import PropTypes from 'prop-types'
import { useTheme } from '@mui/material/styles'
import { InputAdornment, OutlinedInput } from '@mui/material'
import { IconSearch, IconX } from '@tabler/icons-react'

const SearchInput = ({ value, onChange }) => {
  const theme = useTheme()

  return (
    <OutlinedInput
      autoFocus
      className='w-full'
      id='input-search-node'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder='Tìm kiếm nodes'
      startAdornment={
        <InputAdornment position='start'>
          <IconSearch stroke={1.5} size='1rem' color={theme.palette.grey[500]} />
        </InputAdornment>
      }
      endAdornment={
        <InputAdornment
          position='end'
          sx={{
            cursor: 'pointer',
            color: theme.palette.grey[500],
            '&:hover': {
              color: theme.palette.grey[900]
            }
          }}
          title='Clear Search'
        >
          <IconX
            stroke={1.5}
            size='1rem'
            onClick={() => onChange('')}
            style={{
              cursor: 'pointer'
            }}
          />
        </InputAdornment>
      }
      aria-describedby='search-helper-text'
      inputProps={{
        'aria-label': 'weight'
      }}
    />
  )
}

SearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
}

export default SearchInput
