import { useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Dialog, FormControl, InputBase, OutlinedInput } from '@mui/material'
import SelectVariable from '@/ui-component/json/SelectVariable'
import { getAvailableNodesForVariable } from '@/utils/genericHelper'
import { S3Explorer } from 'dccxx-s3-explorer'

import 'dccxx-s3-explorer/dist/style.css'
import { useSelector } from 'react-redux'

import.meta.env.VITE_DOCUMENT_STORE_BASE_URL = import.meta.env.VITE_DOCUMENT_STORE_BASE_URL || 'https://stock.cmcts.ai/c-agent/s3e'

export const Input = ({ inputParam, value, nodes, edges, nodeId, onChange, disabled = false }) => {
  const user = useSelector((state) => state.user)
  const displayPrefixes = user?.displayPrefixes ? JSON?.parse(user?.displayPrefixes.replace(/'/g, '"')) : []

  const [myValue, setMyValue] = useState(value ?? '')
  const [openVariableDialog, setOpenVariableDialog] = useState(false)
  const [openS3Dialog, setOpenS3Dialog] = useState(false)
  const [availableNodesForVariable, setAvailableNodesForVariable] = useState([])
  const ref = useRef(null)
  const inputRef = useRef(null)
  const isKnowledgeFilesInput = useMemo(() => {
    return inputParam.name === 'knowledgeBaseFiles'
  }, [inputParam])

  const handleCloseVariableDialog = () => {
    setOpenVariableDialog(false)
  }

  const handleCloseS3Dialog = () => {
    setOpenS3Dialog(false)
  }

  const handleInputClick = () => {
    if (isKnowledgeFilesInput && !disabled) {
      setOpenS3Dialog(true)
    }
  }

  const handleS3FilesSelected = (files) => {
    const filesStr = JSON.stringify(files)
    setMyValue(filesStr)
    onChange(filesStr)
    handleCloseS3Dialog()
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
      setOpenVariableDialog(true)
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
        <Dialog open={openVariableDialog} onClose={handleCloseVariableDialog} maxWidth='sm' fullWidth>
          <SelectVariable
            disabled={disabled}
            availableNodesForVariable={availableNodesForVariable}
            onSelectAndReturnVal={(val) => {
              setNewVal(val)
              handleCloseVariableDialog()
            }}
          />
        </Dialog>
      )}
      {isKnowledgeFilesInput && (
        <Dialog
          open={openS3Dialog}
          onClose={handleCloseS3Dialog}
          maxWidth='sm'
          fullWidth
          PaperProps={{
            style: {
              padding: '1rem'
            }
          }}
        >
          <S3Explorer
            apiBaseUrl={import.meta.env.VITE_DOCUMENT_STORE_BASE_URL}
            homeLabel='Kho tài liệu'
            rootPrefix=''
            asSelector={true}
            onSelected={handleS3FilesSelected}
            displayPrefixes={displayPrefixes}
          />
        </Dialog>
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
