import PropTypes from 'prop-types'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { baseURL } from '@/store/constant'

const NodeList = ({ nodes, categoryExpanded, onAccordionChange, onDragStart, customization, theme, containerRef, isAgentCanvas }) => {
  const renderNodeItem = (node, index, category) => (
    <div key={node.name} onDragStart={(event) => onDragStart(event, node)} draggable>
      <ListItemButton
        sx={{
          p: 0,
          borderRadius: `${customization.borderRadius}px`,
          cursor: 'move'
        }}
      >
        <ListItem alignItems='center' dense={true}>
          <ListItemAvatar>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: 'white'
              }}
            >
              <img
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 10,
                  objectFit: 'contain'
                }}
                alt={node.name}
                src={`${baseURL}/api/v1/node-icon/${node.name}`}
              />
            </div>
          </ListItemAvatar>
          <ListItemText
            sx={{ ml: 1 }}
            primary={
              <>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <span>{node.label}</span>
                  &nbsp;
                  {node.badge && (
                    <Chip
                      sx={{
                        width: 'max-content',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        background: node.badge === 'DEPRECATING' ? theme.palette.warning.main : theme.palette.teal.main,
                        color: node.badge !== 'DEPRECATING' ? 'white' : 'inherit'
                      }}
                      size='small'
                      label={node.badge}
                    />
                  )}
                </div>
                {node.author && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700
                    }}
                  >
                    By {node.author}
                  </span>
                )}
              </>
            }
            secondary={<span className='text-xs line-clamp-1'>{node.description}</span>}
          />
        </ListItem>
      </ListItemButton>
      {index === nodes[category].length - 1 ? null : <Divider />}
    </div>
  )

  const renderCategoryHeader = (category) => {
    const parts = category.split(';')
    if (parts.length > 1) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <Typography variant='h5'>{parts[0]}</Typography>
          &nbsp;
          <Chip
            sx={{
              width: 'max-content',
              fontWeight: 700,
              fontSize: '0.65rem',
              background: parts[1] === 'DEPRECATING' ? theme.palette.warning.main : theme.palette.teal.main,
              color: parts[1] !== 'DEPRECATING' ? 'white' : 'inherit'
            }}
            size='small'
            label={parts[1]}
          />
        </div>
      )
    }
    return <Typography variant='h5'>{category}</Typography>
  }

  return (
    <PerfectScrollbar
      containerRef={(el) => {
        if (containerRef) containerRef.current = el
      }}
      style={{
        height: '100%',
        maxHeight: `calc(100vh - ${isAgentCanvas ? '300' : '380'}px)`,
        overflowX: 'hidden'
      }}
    >
      <Box sx={{ p: 2, pt: 0 }}>
        <List
          sx={{
            width: '100%',
            maxWidth: 370,
            py: 0,
            borderRadius: '10px',
            [theme.breakpoints.down('md')]: {
              maxWidth: 370
            },
            '& .MuiListItemSecondaryAction-root': {
              top: 22
            },
            '& .MuiDivider-root': {
              my: 0
            },
            '& .list-container': {
              pl: 7
            }
          }}
        >
          {Object.keys(nodes)
            .sort()
            .map((category) => (
              <Accordion
                expanded={categoryExpanded[category] || false}
                onChange={onAccordionChange(category)}
                key={category}
                disableGutters
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`nodes-accordian-${category}`}
                  id={`nodes-accordian-header-${category}`}
                >
                  {renderCategoryHeader(category)}
                </AccordionSummary>
                <AccordionDetails>{nodes[category].map((node, index) => renderNodeItem(node, index, category))}</AccordionDetails>
              </Accordion>
            ))}
        </List>
      </Box>
    </PerfectScrollbar>
  )
}

NodeList.propTypes = {
  nodes: PropTypes.object.isRequired,
  categoryExpanded: PropTypes.object.isRequired,
  onAccordionChange: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  customization: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  containerRef: PropTypes.object,
  isAgentCanvas: PropTypes.bool
}

export default NodeList
