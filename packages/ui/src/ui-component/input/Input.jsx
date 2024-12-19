import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl, InputBase, OutlinedInput, Popover } from '@mui/material'
import SelectVariable from '@/ui-component/json/SelectVariable'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'
import { S3Explorer } from 'dccxx-s3-explorer'

import 'dccxx-s3-explorer/dist/style.css'

export const Input = ({ inputParam, value, nodes, edges, nodeId, onChange, disabled = false }) => {
  const [myValue, setMyValue] = useState(value ?? '')
  const [anchorEl, setAnchorEl] = useState(null)
  const [s3ExplorerAnchorEl, setS3ExplorerAnchorEl] = useState(null)
  const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
  const ref = useRef(null)
  const inputRef = useRef(null)
  const isKnowledgeFilesInput = useMemo(() => {
    return inputParam.name === 'knowledgeBaseFiles'
  }, [inputParam])

  const openPopOver = Boolean(anchorEl)
  const openS3Explorer = Boolean(s3ExplorerAnchorEl)

  const handleClosePopOver = () => {
    setAnchorEl(null)
  }

  const handleCloseS3Explorer = () => {
    setS3ExplorerAnchorEl(null)
  }

  const handleInputClick = () => {
    if (isKnowledgeFilesInput && !disabled) {
      setS3ExplorerAnchorEl(inputRef.current)
    }
  }

  const handleS3FilesSelected = (files) => {
    const filesStr = JSON.stringify(files)
    setMyValue(filesStr)
    onChange(filesStr)
    handleCloseS3Explorer()
  }

  const setNewVal = (val) => {
    const newVal = myValue + val.substring(2)
    onChange(newVal)
    setMyValue(newVal)
  }

  const getInputType = (type) => {
    switch (type) {
      case 'string':
        return 'text'
      case 'password':
        return 'password'
      case 'number':
        return 'number'
      default:
        return 'text'
    }
  }

  useEffect(() => {
    if (!disabled && nodes && edges && nodeId && inputParam) {
      const nodesForVariable = inputParam?.acceptVariable ? getAvailableNodesForVariable(nodes, edges, nodeId, inputParam.id) : []
      setAvailableNodesForVariable(nodesForVariable)
    }
  }, [disabled, inputParam, nodes, edges, nodeId])

  useEffect(() => {
    if (typeof myValue === 'string' && myValue && myValue.endsWith('{{')) {
      setAnchorEl(ref.current)
    }
  }, [myValue])

  return (
    <>
      {inputParam.name === 'note' ? (
        <FormControl sx={{ width: '100%', height: 'auto' }} size='small'>
          <InputBase
            id={nodeId}
            size='small'
            disabled={disabled}
            type={getInputType(inputParam.type)}
            placeholder={inputParam.placeholder}
            multiline={!!inputParam.rows}
            minRows={inputParam.rows ?? 1}
            value={myValue}
            name={inputParam.name}
            onChange={(e) => {
              setMyValue(e.target.value)
              onChange(e.target.value)
            }}
            inputProps={{
              step: inputParam.step ?? 1,
              style: {
                border: 'none',
                background: 'none',
                color: '#212121'
              }
            }}
            sx={{
              border: 'none',
              background: 'none',
              padding: '10px 14px',
              textarea: {
                '&::placeholder': {
                  color: '#616161'
                }
              }
            }}
            ref={inputRef}
            onClick={handleInputClick}
          />
        </FormControl>
      ) : (
        <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
          <OutlinedInput
            id={inputParam.name}
            size='small'
            disabled={disabled}
            type={getInputType(inputParam.type)}
            placeholder={inputParam.placeholder}
            multiline={!!inputParam.rows}
            rows={inputParam.rows ?? 1}
            value={myValue}
            name={inputParam.name}
            onChange={(e) => {
              setMyValue(e.target.value)
              onChange(e.target.value)
            }}
            inputProps={{
              step: inputParam.step ?? 1,
              style: {
                height: inputParam.rows ? '90px' : 'inherit'
              }
            }}
            ref={inputRef}
            onClick={handleInputClick}
          />
        </FormControl>
      )}
      <div ref={ref}></div>
      {inputParam?.acceptVariable && (
        <Popover
          open={openPopOver}
          anchorEl={anchorEl}
          onClose={handleClosePopOver}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
        >
          <SelectVariable
            disabled={disabled}
            availableNodesForVariable={availableNodesForVariable}
            onSelectAndReturnVal={(val) => {
              setNewVal(val)
              handleClosePopOver()
            }}
          />
        </Popover>
      )}
      {isKnowledgeFilesInput && (
        <Popover
          open={openS3Explorer}
          anchorEl={s3ExplorerAnchorEl}
          onClose={handleCloseS3Explorer}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left'
          }}
          slotProps={{
            paper: {
              style: {
                width: '400px',
                maxHeight: '600px',
                padding: '1rem'
              }
            }
          }}
        >
          <S3Explorer
            apiBaseUrl={import.meta.env.VITE_DOCUMENT_STORE_BASE_URL}
            homeLabel='Kho tài liệu'
            rootPrefix=''
            asSelector={true}
            onSelected={handleS3FilesSelected}
          />
        </Popover>
      )}
    </>
  )
}

Input.propTypes = {
  inputParam: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  nodes: PropTypes.array,
  edges: PropTypes.array,
  nodeId: PropTypes.string
}
