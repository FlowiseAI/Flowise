import PropTypes from 'prop-types'
import { Tab, Tabs } from '@mui/material'
import { IconApps, IconTool } from '@tabler/icons-react'
import { tabOptions, a11yProps } from '../constants/nodeConstants'

const NodeTabs = ({ value, onChange }) => {
  return (
    <Tabs
      sx={{ position: 'relative', minHeight: '50px', height: '50px' }}
      variant='fullWidth'
      value={value}
      onChange={onChange}
      aria-label='tabs'
    >
      {tabOptions.map((item, index) => (
        <Tab
          icon={item.icon === 'apps' ? <IconApps size={item.size} /> : <IconTool size={item.size} />}
          iconPosition='start'
          sx={{ minHeight: '50px', height: '50px' }}
          key={index}
          label={item.label}
          {...a11yProps(index)}
        />
      ))}
    </Tabs>
  )
}

NodeTabs.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired
}

export default NodeTabs
