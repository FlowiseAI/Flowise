import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Box, FormControl, FormControlLabel, Radio, RadioGroup, Skeleton, Stack } from '@mui/material'
import { FlowListTable } from '@/ui-component/table/FlowListTable'
import ItemCard from '@/ui-component/cards/ItemCard'
import WorkflowEmptySVG from '@/assets/images/workflow_empty.svg'
import { gridSpacing } from '@/store/constant'

const RenderContent = ({
  data: dataInput,
  isLoading,
  filterFunction,
  updateFlowsApi,
  isAdmin = false,
  view,
  goToCanvas,
  images,
  setError
}) => {
  const [data, setData] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (dataInput && filter === 'publish') {
      setData(dataInput.filter((item) => item.isPublic))
    }
    if (dataInput && filter === 'unpublish') {
      setData(dataInput.filter((item) => !item.isPublic))
    }
    if (dataInput && filter === 'all') {
      setData(dataInput)
    }
  }, [dataInput, filter])

  return (
    <div className='relative'>
      {isAdmin && (
        <FormControl className='absolute top-[-45px] left-0'>
          <RadioGroup
            onChange={(e) => setFilter(e.target.value)}
            aria-labelledby='demo-radio-buttons-group-label'
            defaultValue='all'
            name='radio-buttons-group'
            row
          >
            <FormControlLabel value='all' control={<Radio />} label='Tất cả' />
            <FormControlLabel value='publish' control={<Radio />} label='Đã publish' />
            <FormControlLabel value='unpublish' control={<Radio />} label='Chưa publish' />
          </RadioGroup>
        </FormControl>
      )}
      {view === 'card' ? (
        isLoading ? (
          <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
            <Skeleton variant='rounded' height={160} />
            <Skeleton variant='rounded' height={160} />
            <Skeleton variant='rounded' height={160} />
          </Box>
        ) : (
          <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
            {data?.filter(filterFunction).map((item, index) => (
              <ItemCard key={index} onClick={() => goToCanvas(item)} data={item} images={images[item.id]} />
            ))}
          </Box>
        )
      ) : (
        <FlowListTable
          data={data}
          images={images}
          isLoading={isLoading}
          filterFunction={filterFunction}
          updateFlowsApi={updateFlowsApi}
          setError={setError}
        />
      )}
      {!isLoading && (!data || data.length === 0) && (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
          <Box sx={{ p: 2, height: 'auto' }}>
            <img style={{ objectFit: 'cover', height: '25vh', width: 'auto' }} src={WorkflowEmptySVG} alt='WorkflowEmptySVG' />
          </Box>
          <div>Người dùng chưa tạo chatflow nào, tạo mới chatflow</div>
        </Stack>
      )}
    </div>
  )
}

RenderContent.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool.isRequired,
  filterFunction: PropTypes.func.isRequired,
  updateFlowsApi: PropTypes.object.isRequired,
  isAdmin: PropTypes.bool,
  view: PropTypes.string.isRequired,
  goToCanvas: PropTypes.func.isRequired,
  images: PropTypes.object.isRequired,
  setError: PropTypes.func.isRequired
}

export default RenderContent
