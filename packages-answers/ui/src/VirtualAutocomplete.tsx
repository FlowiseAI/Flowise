import React from 'react'
import { VariableSizeList, ListChildComponentProps } from 'react-window'

import styled from '@emotion/styled'

import ListSubheader from '@mui/material/ListSubheader'
import Typography from '@mui/material/Typography'
import Popper from '@mui/material/Popper'
import Autocomplete from '@mui/material/Autocomplete'
import { autocompleteClasses, useTheme, createFilterOptions, useMediaQuery } from '@mui/material'

const LISTBOX_PADDING = 8 // px

function renderRow(props: ListChildComponentProps) {
    const { data, index, style } = props
    const dataSet = data[index]
    const inlineStyle = {
        ...style,
        top: (style.top as number) + LISTBOX_PADDING
    }

    if (Object.prototype.hasOwnProperty.call(dataSet, 'group')) {
        return (
            <ListSubheader key={dataSet.key} component='div' style={inlineStyle}>
                {dataSet.group}
            </ListSubheader>
        )
    }

    return (
        <Typography component='li' {...dataSet[0]} noWrap style={inlineStyle}>
            {`${dataSet[1]}`}
        </Typography>
    )
}

const OuterElementContext = React.createContext({})

// eslint-disable-next-line react/display-name
const OuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
    const outerProps = React.useContext(OuterElementContext)
    return <div ref={ref} {...props} {...outerProps} />
})

function useResetCache(data: any) {
    const ref = React.useRef<VariableSizeList>(null)
    React.useEffect(() => {
        if (ref.current != null) {
            ref.current.resetAfterIndex(0, true)
        }
    }, [data])
    return ref
}

// Adapter for react-window
const ListboxComponent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLElement>>(function ListboxComponent(props, ref) {
    const { children, ...other } = props
    const itemData: React.ReactChild[] = []
    ;(children as React.ReactChild[]).forEach((item: React.ReactChild & { children?: React.ReactChild[] }) => {
        itemData.push(item)
        itemData.push(...(item.children || []))
    })

    const theme = useTheme()
    const smUp = useMediaQuery(theme.breakpoints.up('sm'), {
        noSsr: true
    })
    const itemCount = itemData.length
    const itemSize = smUp ? 36 : 48

    const getChildSize = (child: React.ReactChild) => {
        if (Object.prototype.hasOwnProperty.call(child, 'group')) {
            return 48
        }

        return itemSize
    }

    const getHeight = () => {
        if (itemCount > 8) {
            return 8 * itemSize
        }
        return itemData.map(getChildSize).reduce((a, b) => a + b, 0)
    }

    const gridRef = useResetCache(itemCount)

    return (
        <div ref={ref}>
            <OuterElementContext.Provider value={other}>
                <VariableSizeList
                    itemData={itemData}
                    height={getHeight() + 2 * LISTBOX_PADDING}
                    width='100%'
                    ref={gridRef}
                    outerElementType={OuterElementType}
                    innerElementType='ul'
                    itemSize={(index) => getChildSize(itemData[index])}
                    overscanCount={5}
                    itemCount={itemCount}
                >
                    {renderRow}
                </VariableSizeList>
            </OuterElementContext.Provider>
        </div>
    )
})

function random(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return result
}

const StyledPopper = styled(Popper)({
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 0,
            margin: 0
        }
    }
})
const filter = createFilterOptions<string>()

export default function VirtualAutocomplete(props: any) {
    return (
        <Autocomplete
            id='virtualize-demo'
            // sx={{ width: 300 }}
            disableListWrap
            PopperComponent={StyledPopper}
            ListboxComponent={ListboxComponent}
            options={props.options}
            // groupBy={(option) => option[0].toUpperCase()}
            renderOption={(props, option, state) => [props, option, state.index] as React.ReactNode}
            // TODO: Post React 18 update - validate this conversion, look like a hidden bug
            renderGroup={(params) => params as unknown as React.ReactNode}
            // filterOptions={(options, params) => {
            //   const filtered = filter(options, params);

            //   const { inputValue } = params;
            //   // Suggest the creation of a new value
            //   const isExisting = options.some((option) => inputValue === option);
            //   if (inputValue !== '' && !isExisting) {
            //     filtered.push({
            //       inputValue,
            //       title: `Add "${inputValue}"`
            //     });
            //   }

            //   return filtered;
            // }}
            {...props}
        />
    )
}
