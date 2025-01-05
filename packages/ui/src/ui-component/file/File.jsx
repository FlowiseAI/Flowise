import { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { FormControl } from '@mui/material'
import { Button } from '@/components/ui/button'
import { IconUpload } from '@tabler/icons-react'
import { getFileName } from '@/utils/genericHelper'

export const File = ({ value, formDataUpload, fileType, onChange, onFormDataChange, disabled = false }) => {
    const fileUploadRef = useRef(null)
    const [myValue, setMyValue] = useState(value ?? '')

    const triggerFileUpload = () => {
        fileUploadRef?.current?.click()
    }

    const handleFileUpload = async (e) => {
        if (!e.target.files) return

        if (e.target.files.length === 1) {
            const file = e.target.files[0]
            const { name } = file

            const reader = new FileReader()
            reader.onload = (evt) => {
                if (!evt?.target?.result) {
                    return
                }
                const { result } = evt.target

                const value = result + `,filename:${name}`

                setMyValue(value)
                onChange(value)
            }
            reader.readAsDataURL(file)
        } else if (e.target.files.length > 0) {
            let files = Array.from(e.target.files).map((file) => {
                const reader = new FileReader()
                const { name } = file

                return new Promise((resolve) => {
                    reader.onload = (evt) => {
                        if (!evt?.target?.result) {
                            return
                        }
                        const { result } = evt.target
                        const value = result + `,filename:${name}`
                        resolve(value)
                    }
                    reader.readAsDataURL(file)
                })
            })

            const res = await Promise.all(files)
            setMyValue(JSON.stringify(res))
            onChange(JSON.stringify(res))
        }
    }

    const handleFormDataUpload = async (e) => {
        if (!e.target.files) return

        if (e.target.files.length === 1) {
            const file = e.target.files[0]
            const { name } = file
            const formData = new FormData()
            formData.append('files', file)
            setMyValue(`,filename:${name}`)
            onChange(`,filename:${name}`)
            onFormDataChange(formData)
        } else if (e.target.files.length > 0) {
            const formData = new FormData()
            const values = []
            for (let i = 0; i < e.target.files.length; i++) {
                formData.append('files', e.target.files[i])
                values.push(`,filename:${e.target.files[i].name}`)
            }
            setMyValue(JSON.stringify(values))
            onChange(JSON.stringify(values))
            onFormDataChange(formData)
        }
    }

    return (
        <FormControl className='w-full flex flex-col justify-start gap-2' size='small'>
            {!formDataUpload && (
                <span className='italic text-muted-foreground'>{myValue ? getFileName(myValue) : 'Choose a file to upload'}</span>
            )}
            <Button disabled={disabled} onClick={triggerFileUpload} size='sm' variant='outline'>
                <IconUpload />
                Upload File
            </Button>
            <input
                type='file'
                multiple
                accept={fileType}
                hidden
                onChange={(e) => (formDataUpload ? handleFormDataUpload(e) : handleFileUpload(e))}
                ref={fileUploadRef}
            />
        </FormControl>
    )
}

File.propTypes = {
    value: PropTypes.string,
    fileType: PropTypes.string,
    formDataUpload: PropTypes.bool,
    onChange: PropTypes.func,
    onFormDataChange: PropTypes.func,
    disabled: PropTypes.bool
}
