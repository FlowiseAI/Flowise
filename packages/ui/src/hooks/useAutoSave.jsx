import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { isEqual } from 'lodash'

const useAutoSave = ({ onAutoSave, interval = 60000, debounce = 1000 }) => {
    const canvas = useSelector((state) => state.canvas.present)
    const [isSaving, setIsSaving] = useState(false)
    const timeoutRef = useRef(null)
    const previousSaveRef = useRef(null)
    const onAutoSaveRef = useRef(onAutoSave)

    useEffect(() => {
        onAutoSaveRef.current = onAutoSave
    }, [onAutoSave])

    // debounced save function
    const debouncedSave = useCallback(() => {
        setIsSaving(true)

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
            if (canvas.chatflow && canvas.chatflow.flowData) {
                const currentData = {
                    chatflowId: canvas.chatflow.id,
                    chatflowName: canvas.chatflow.name,
                    flowData: canvas.chatflow.flowData
                }

                const hasChanged = !previousSaveRef.current || !isEqual(currentData, previousSaveRef.current)

                if (hasChanged) {
                    onAutoSaveRef.current(currentData)
                    previousSaveRef.current = currentData
                }
            }
            setIsSaving(false)
        }, debounce)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounce, canvas.chatflow?.id, canvas.chatflow?.name, canvas.chatflow?.flowData])

    // watch for changes to trigger debounced save
    useEffect(() => {
        if (canvas.chatflow?.flowData || canvas.chatflow?.name) {
            debouncedSave()
        }
    }, [canvas.chatflow?.flowData, canvas.chatflow?.name, debouncedSave])

    // periodic saves
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (canvas.chatflow && !isEqual(canvas.chatflow, previousSaveRef.current)) {
                onAutoSaveRef.current({
                    chatflowId: canvas.chatflow.id,
                    chatflowName: canvas.chatflow.name,
                    flowData: canvas.chatflow.flowData
                })
                previousSaveRef.current = canvas.chatflow
            }
        }, interval)

        return () => {
            clearInterval(intervalId)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval])

    // force an immediate save
    const forceSave = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        if (canvas.chatflow && !isEqual(canvas.chatflow, previousSaveRef.current)) {
            onAutoSaveRef.current({
                chatflowId: canvas.chatflow.id,
                chatflowName: canvas.chatflow.name,
                flowData: canvas.chatflow.flowData
            })
            previousSaveRef.current = canvas.chatflow
        }
    }, [canvas.chatflow])

    return [canvas.chatflow, isSaving, forceSave]
}

export default useAutoSave
